import { WorkerEntrypoint } from 'cloudflare:workers'
import { ProxyToSelf } from 'workers-mcp'

interface Env {
  SHARED_SECRET: string;
}

export default class MyWorker extends WorkerEntrypoint<Env> {
  /**
   * A warm, friendly greeting from your new Workers MCP server.
   * @param name {string} the name of the person we are greeting.
   * @return {string} the contents of our greeting.
   */
  sayHello(name: string) {
    return `Hello from an MCP Worker, ${name}!`
  }

  /**
   * @ignore
   **/
  async fetch(request: Request): Promise<Response> {
    // Log request method and URL for debugging
    console.log(`Request method: ${request.method}, URL: ${request.url}`);
    const url = new URL(request.url);
    console.log(`Path: ${url.pathname}`);
    
    // Debug logging for all headers
    console.log("Request headers:", JSON.stringify(Object.fromEntries([...request.headers])));
    
    // Log partial secret for debugging (masking most of it for security)
    if (this.env.SHARED_SECRET) {
      const secretStart = this.env.SHARED_SECRET.substring(0, 4);
      const secretEnd = this.env.SHARED_SECRET.substring(this.env.SHARED_SECRET.length - 4);
      console.log(`SHARED_SECRET exists: ${!!this.env.SHARED_SECRET}, length: ${this.env.SHARED_SECRET.length}, preview: ${secretStart}...${secretEnd}`);
    } else {
      console.log("WARNING: No SHARED_SECRET in environment");
    }
    
    try {
      // Check if it's a direct browser request (for testing/debugging)
      const isBrowserRequest = request.headers.get('sec-fetch-dest') !== null;
      
      // Add some basic verification for the secret if needed
      const requestSecret = request.headers.get('x-mcp-shared-secret');
      if (!isBrowserRequest && (!requestSecret || requestSecret !== this.env.SHARED_SECRET)) {
        console.error("Authentication failed: Invalid or missing secret");
        return new Response("Unauthorized", { status: 401 });
      }
      
      // Use the standard ProxyToSelf for MCP handling
      return new ProxyToSelf(this).fetch(request);
    } catch (error) {
      console.error("Error in proxy handler:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }
}
