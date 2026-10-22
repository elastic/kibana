/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { CallToolResult, JSONRPCMessage, Tool } from '@modelcontextprotocol/sdk/types.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { CfWorkerJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/cfworker-provider.js';
import type { ResponseFixture } from '../engine/response_engine';
import { createExchangeTransport } from '../mcp/exchange_transport';
import { readMessages, transportErrorResponse } from '../mcp/mcp_protocol';
import { isRecord } from '../openapi/schema_walk';
import { checkFixtures } from './check_fixtures';
import type { ControlledEmulator } from './controlled_emulator';

export interface EmulatorMcpOptions {
  /**
   * Writes the runtime fixtures somewhere lasting, such as a connector's committed fixtures, and
   * says where. Without it, the `export_fixtures` tool isn't offered.
   */
  readonly exportFixtures?: (fixtures: readonly ResponseFixture[]) => Promise<string>;
}

const INSTRUCTIONS = `Controls a running connector emulator, which answers a connector's vendor API
calls from the vendor's specs, so a connector in Kibana can be tested without the real service.

To test how a connector handles a response it doesn't usually get (an error status, an empty list,
another page, a value the vendor just added):
1. list_operations to find the vendor operation the action calls;
2. describe_operation for its responses, schemas and a sample that conforms;
3. set_fixtures with the response you want, starting from the sample; use \`when\` to answer only
   some requests. Responses the vendor's spec doesn't allow are rejected with the reasons, except
   error statuses it doesn't declare (such as 429);
4. run the action through Kibana, then list_calls to see what it sent and what it got;
5. clear_fixtures or reset when done.`;

const COMBINED_INSTRUCTIONS = `

The emulator serves several connectors, each with its own vendor specs. Pass \`connector\` to see or
change only one of them; set_fixtures needs it when several connectors have the operation.`;

const LIMIT = { maxLength: 500 } as const;

const fixtureSchema = {
  type: 'object',
  required: ['operation', 'response'],
  properties: {
    operation: {
      type: 'object',
      description: 'The OpenAPI operation, by method and path template as list_operations shows it',
      required: ['method', 'path'],
      properties: {
        method: { type: 'string', ...LIMIT },
        path: { type: 'string', ...LIMIT },
        source: { type: 'string', description: 'The spec, when there are several', ...LIMIT },
      },
    },
    when: {
      type: 'object',
      description:
        'Answer only requests with these values: { path, query, headers } by value, and the fields of a body it lists',
      properties: {
        path: { type: 'object', additionalProperties: { type: 'string', ...LIMIT } },
        query: { type: 'object' },
        headers: { type: 'object', additionalProperties: { type: 'string', ...LIMIT } },
        body: {},
      },
    },
    response: {
      type: 'object',
      required: ['status'],
      properties: {
        status: { type: 'integer', minimum: 100, maximum: 599 },
        headers: { type: 'object', additionalProperties: { type: 'string', ...LIMIT } },
        body: { description: 'The response body, as JSON' },
      },
    },
  },
};

const TOOLS: Tool[] = [
  {
    name: 'list_operations',
    description:
      'Lists the vendor operations the emulator answers: OpenAPI operations by id, method and path, and GraphQL or MCP operations by name. Filter with search, matched against ids, paths and names.',
    inputSchema: {
      type: 'object',
      properties: { search: { type: 'string', description: 'Case-insensitive text', ...LIMIT } },
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'describe_operation',
    description:
      "Describes an OpenAPI operation by its id from list_operations: parameters, request body, and each response's status, headers, schema, examples and a sample that conforms. Start a fixture from the sample.",
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string', ...LIMIT },
        source: { type: 'string', description: 'The spec, when there are several', ...LIMIT },
      },
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'set_fixtures',
    description:
      "Sets responses for OpenAPI operations until cleared, replacing those set earlier for the same operations. They take precedence over the emulator's other responses. Responses the vendor's spec doesn't allow are rejected with the reasons, and then none is set; error statuses the spec doesn't declare, such as 429, are allowed.",
    inputSchema: {
      type: 'object',
      required: ['fixtures'],
      properties: { fixtures: { type: 'array', maxItems: 100, items: fixtureSchema } },
    },
  },
  {
    name: 'list_fixtures',
    description: 'Lists the responses set with set_fixtures that are in effect.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'clear_fixtures',
    description:
      'Clears the responses set with set_fixtures for one OpenAPI operation (by id), or all of them.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', ...LIMIT }, source: { type: 'string', ...LIMIT } },
    },
    annotations: { idempotentHint: true },
  },
  {
    name: 'list_calls',
    description:
      'Lists the requests the emulator received, in order: the operation, the status it answered, where the response came from (responseSource), and any violations of the vendor spec by the request or response. Pass since (the total of an earlier call) to see only later requests.',
    inputSchema: {
      type: 'object',
      properties: { since: { type: 'integer', minimum: 0 } },
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'reset',
    description:
      'Empties the list of calls, clears the state kept across requests, and clears every response set with set_fixtures.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { destructiveHint: true, idempotentHint: true },
  },
];

const EXPORT_TOOL: Tool = {
  name: 'export_fixtures',
  description:
    'Saves the responses set with set_fixtures as committed fixtures, so the scenario becomes a lasting one, and says where.',
  inputSchema: { type: 'object', properties: {} },
};

const ok = (value: unknown): CallToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
});

const failed = (message: string, details?: unknown): CallToolResult => ({
  content: [
    {
      type: 'text',
      text: details === undefined ? message : `${message}\n${JSON.stringify(details, null, 2)}`,
    },
  ],
  isError: true,
});

const text = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const toHeaders = (headers: Headers): Record<string, string> => {
  const record: Record<string, string> = {};
  headers.forEach((value, name) => {
    record[name.toLowerCase()] = value;
  });
  return record;
};

const parseBody = (body: string): unknown => {
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
};

/**
 * Serves an MCP server, over stateless Streamable HTTP, whose tools control an emulator: list and
 * describe its operations, set and clear runtime fixtures, list its calls and reset it. It uses
 * the same emulator, and so the same checks, as the control endpoints.
 */
export const createEmulatorMcpHandler = (
  emulator: ControlledEmulator,
  { exportFixtures }: EmulatorMcpOptions = {}
): ((request: Request) => Promise<Response>) => {
  const { connectors } = emulator;
  // Combined emulators take the connector each tool is about.
  const withConnector = (tool: Tool): Tool =>
    connectors
      ? {
          ...tool,
          inputSchema: {
            ...tool.inputSchema,
            properties: {
              ...tool.inputSchema.properties,
              connector: {
                type: 'string',
                enum: [...connectors],
                description: 'Only this connector',
              },
            },
          },
        }
      : tool;
  const tools = (exportFixtures ? [...TOOLS, EXPORT_TOOL] : TOOLS).map(withConnector);
  const byConnector = <T extends { readonly connector?: string }>(
    items: readonly T[],
    connector: string | undefined
  ): readonly T[] =>
    connector === undefined ? items : items.filter((item) => item.connector === connector);

  const call = async (name: string, args: Record<string, unknown>): Promise<CallToolResult> => {
    const connector = text(args.connector);
    if (connector !== undefined && !connectors?.includes(connector)) {
      return failed(
        connectors
          ? `No connector ${connector}; there are ${connectors.join(', ')}`
          : 'The emulator serves one connector; leave out connector'
      );
    }
    switch (name) {
      case 'list_operations': {
        const search = text(args.search)?.toLowerCase();
        const operations = byConnector(emulator.operations, connector);
        return ok(
          search === undefined
            ? operations
            : operations.filter((operation) =>
                JSON.stringify(operation).toLowerCase().includes(search)
              )
        );
      }
      case 'describe_operation': {
        const id = text(args.id) ?? '';
        const description = emulator.describeOperation(id, {
          source: text(args.source),
          connector,
        });
        return description
          ? ok(description)
          : failed(`No OpenAPI operation has the id ${id}; list_operations shows the ids`);
      }
      case 'set_fixtures': {
        const checked = checkFixtures(args);
        if ('error' in checked) {
          return failed(checked.error.replace('The body', 'The arguments'));
        }
        const rejected = emulator.runtimeFixtures.set(checked.fixtures, { connector });
        return rejected.length > 0
          ? failed("The vendor's spec rejects these fixtures, so none was set:", rejected)
          : ok({ fixtures: emulator.runtimeFixtures.list({ connector }) });
      }
      case 'list_fixtures':
        return ok({ fixtures: emulator.runtimeFixtures.list({ connector }) });
      case 'clear_fixtures':
        emulator.runtimeFixtures.clear({ id: text(args.id), source: text(args.source), connector });
        return ok({ fixtures: emulator.runtimeFixtures.list({ connector }) });
      case 'list_calls': {
        const since = typeof args.since === 'number' ? args.since : 0;
        const calls = byConnector(emulator.calls, connector);
        return ok({ calls: calls.slice(since), total: calls.length });
      }
      case 'reset':
        emulator.reset(connector);
        return ok({ reset: connector ?? true });
      case 'export_fixtures':
        return exportFixtures
          ? ok({ exportedTo: await exportFixtures(emulator.runtimeFixtures.list({ connector })) })
          : failed('Exporting fixtures is not available');
      default:
        throw new McpError(ErrorCode.InvalidParams, `Unknown tool ${name}`);
    }
  };

  const answer = async (messages: readonly JSONRPCMessage[]): Promise<JSONRPCMessage[]> => {
    const server = new Server(
      { name: 'connector-emulator-control', version: '1.0.0' },
      {
        capabilities: { tools: {} },
        instructions: connectors ? `${INSTRUCTIONS}${COMBINED_INSTRUCTIONS}` : INSTRUCTIONS,
        // The SDK's default Ajv validator compiles schemas to code, which Jest disallows.
        jsonSchemaValidator: new CfWorkerJsonSchemaValidator(),
      }
    );
    server.setRequestHandler(ListToolsRequestSchema, () => ({ tools }));
    server.setRequestHandler(CallToolRequestSchema, ({ params }) =>
      call(params.name, isRecord(params.arguments) ? params.arguments : {})
    );
    const transport = createExchangeTransport();
    await server.connect(transport);
    try {
      return await transport.exchange(messages);
    } finally {
      await server.close();
    }
  };

  return async (request) => {
    // A stateless server offers no event stream and no session to delete.
    if (request.method !== 'POST') {
      return Response.json(
        { jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null },
        { status: 405, headers: { allow: 'POST' } }
      );
    }
    const read = readMessages({
      headers: toHeaders(request.headers),
      body: parseBody(await request.text()),
    });
    if ('statusCode' in read) {
      const { statusCode, headers, body } = transportErrorResponse(read);
      return Response.json(body, { status: statusCode, headers });
    }
    const replies = await answer(read.messages);
    if (replies.length === 0) {
      return new Response(null, { status: 202 });
    }
    return Response.json(read.batch ? replies : replies[0]);
  };
};
