/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import http from 'http';
import type { AddressInfo } from 'net';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
// The web standard transport, as the Node one depends on @hono/node-server, an ES module Jest cannot load here.
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { Supervisor } from '../supervisor';
import { splitArgs } from '../tools';
import type { ServiceDefinition, ToolOptions } from '../types';
import { callTool, TOOLS } from './mcp_tools';

export const MCP_SERVER_NAME = 'esprocs';
export const DEFAULT_MCP_PORT = 5690;
const HOST = '127.0.0.1';
const MCP_PATH = '/mcp';

const INSTRUCTIONS = `Controls a local Kibana development environment started with \`node scripts/dev\`: Elasticsearch,
Kibana, and dev tools such as synthtrace, the connector emulator and data forge.

- list_processes shows each process with its state (waiting, starting, ready, stopping, stopped, exited, failed);
- read_logs shows the latest output of one, e.g. to find why Kibana failed;
- start_process, stop_process and restart_process control one; tools take their arguments as \`args\`;
- wait_until_ready waits until a process is ready, e.g. Kibana after a restart.`;

/** Reads the port from the MCP server's arguments, e.g. `--port 5690` or `--port=0` for any free port. */
export const parseMcpPort = (input: string): number => {
  const args = splitArgs(input);
  let port = DEFAULT_MCP_PORT;
  for (let index = 0; index < args.length; index++) {
    const [name, inline] = args[index].split(/=(.*)/s, 2);
    if (name !== '--port') {
      throw new Error(`Unknown argument ${args[index]}; the MCP server takes --port`);
    }
    if (inline === undefined) {
      index++;
    }
    port = Number(inline ?? args[index]);
  }
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`--port must be a port number`);
  }
  return port;
};

/** How to add the server at `url` to an agent. */
export const getConnectInstructions = (url: string): readonly string[] => [
  `Address: ${url} (MCP over streamable HTTP, local connections only)`,
  '',
  'Claude Code:',
  `  claude mcp add --transport http ${MCP_SERVER_NAME} ${url}`,
  '',
  'Cursor and other agents with an mcpServers config file:',
  `  { "mcpServers": { "${MCP_SERVER_NAME}": { "url": "${url}" } } }`,
  '',
  'VS Code, in .vscode/mcp.json:',
  `  { "servers": { "${MCP_SERVER_NAME}": { "type": "http", "url": "${url}" } } }`,
  '',
  `Tools: ${TOOLS.map(({ name }) => name).join(', ')}`,
];

const getUrl = (port: number) => `http://${HOST}:${port}${MCP_PATH}`;

/**
 * Whether a request comes from a local client rather than a web page: a page can reach 127.0.0.1 too, but sends
 * its own site as Origin, or an attacker's domain as Host after DNS rebinding.
 */
export const isLocalRequest = (
  { host, origin }: { host?: string; origin?: string },
  port: number
) => {
  const localHosts = [`${HOST}:${port}`, `localhost:${port}`];
  if (!host || !localHosts.includes(host)) {
    return false;
  }
  return origin === undefined || localHosts.some((localHost) => origin === `http://${localHost}`);
};

// MCP messages are small; this bounds what a client can make the server buffer.
const MAX_BODY_BYTES = 4 * 1024 * 1024;

const toWebRequest = async (request: http.IncomingMessage, url: string): Promise<Request> => {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw new Error(`The request is larger than ${MAX_BODY_BYTES} bytes`);
    }
    chunks.push(chunk);
  }
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    (Array.isArray(value) ? value : value === undefined ? [] : [value]).forEach((item) =>
      headers.append(name, item)
    );
  }
  const method = request.method ?? 'GET';
  const hasBody = method !== 'GET' && method !== 'HEAD';
  return new Request(url, { method, headers, body: hasBody ? Buffer.concat(chunks) : undefined });
};

const writeWebResponse = async (webResponse: Response, response: http.ServerResponse) => {
  response.writeHead(webResponse.status, Object.fromEntries(webResponse.headers));
  if (webResponse.body) {
    for await (const chunk of webResponse.body) {
      response.write(chunk);
    }
  }
  response.end();
};

const createProtocolServer = (supervisor: Supervisor): Server => {
  const server = new Server(
    { name: MCP_SERVER_NAME, version: '1.0.0' },
    { capabilities: { tools: {} }, instructions: INSTRUCTIONS }
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [...TOOLS] }));
  server.setRequestHandler(CallToolRequestSchema, async ({ params }) =>
    callTool(supervisor, params.name, params.arguments ?? {})
  );
  return server;
};

/** The MCP server as a tool of the TUI: started on demand, inside the supervisor, with `--port` as its arguments. */
export const createMcpService = ({
  getSupervisor,
}: {
  /** The supervisor is created after its definitions, this one included. */
  readonly getSupervisor: () => Supervisor;
}): ServiceDefinition => {
  let args = `--port ${DEFAULT_MCP_PORT}`;
  const tool: ToolOptions = {
    description: 'Lets coding agents see and control these processes over MCP',
    getArgs: () => args,
    setArgs: (input) => {
      parseMcpPort(input);
      args = input;
    },
    // It runs inside node scripts/dev, as it controls its processes.
    getCommand: () => `node scripts/dev --mcp (it runs inside node scripts/dev)`,
    helpCommand: 'esprocs MCP server',
    readHelp: async () => [
      ...getConnectInstructions(getUrl(parseMcpPort(args))),
      '',
      'Press s to start it, or start node scripts/dev with --mcp.',
    ],
  };

  return {
    id: 'mcp',
    tool,
    run: async ({ log }) => {
      const port = parseMcpPort(args);
      const httpServer = http.createServer((request, response) => {
        const actualPort = (httpServer.address() as AddressInfo).port;
        if (!isLocalRequest(request.headers, actualPort)) {
          response.writeHead(403).end('Only local clients may use this MCP server');
          return;
        }
        if (request.url?.split('?')[0] !== MCP_PATH) {
          response.writeHead(404).end(`The MCP server is at ${MCP_PATH}`);
          return;
        }
        // Stateless: a server and transport per request, as the processes are the only state.
        const server = createProtocolServer(getSupervisor());
        const transport = new WebStandardStreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
          enableJsonResponse: true,
        });
        response.on('close', () => {
          void transport.close();
          void server.close();
        });
        server
          .connect(transport)
          .then(() => toWebRequest(request, getUrl(actualPort)))
          .then((webRequest) => transport.handleRequest(webRequest))
          .then((webResponse) => writeWebResponse(webResponse, response))
          .catch((error: Error) => {
            log(`MCP request failed: ${error.message}`);
            if (!response.headersSent) {
              response.writeHead(500).end();
            }
          });
      });
      await new Promise<void>((resolve, reject) => {
        httpServer.once('error', reject);
        httpServer.listen(port, HOST, () => {
          httpServer.off('error', reject);
          resolve();
        });
      });
      const url = getUrl((httpServer.address() as AddressInfo).port);
      log(`MCP server listening at ${url}`);
      log('');
      getConnectInstructions(url).forEach(log);

      return {
        url,
        stop: () =>
          new Promise<void>((resolve) => {
            httpServer.closeAllConnections();
            httpServer.close(() => resolve());
          }),
      };
    },
  };
};
