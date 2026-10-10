/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { JSONRPCMessage, RequestId } from '@modelcontextprotocol/sdk/types.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  isJSONRPCRequest,
  JSONRPCMessageSchema,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import type {
  ContractProtocol,
  ContractRequest,
  ContractResponse,
  NamedOperation,
  ProtocolExchange,
  Violation,
} from '../contract/types';
import { sampleJsonSchema } from '../engine/sample_schema';
import { toEndpoint } from '../graphql/graphql_protocol';
import { validateValue } from '../openapi/schema_violations';
import type { ContractSpec, JsonSchema } from '../openapi/types';
import { createExchangeTransport } from './exchange_transport';

/** A tool as an MCP server's `tools/list` describes it. */
export interface McpTool {
  readonly name: string;
  readonly description?: string;
  readonly inputSchema: JsonSchema;
  readonly outputSchema?: JsonSchema;
  readonly annotations?: { readonly readOnlyHint?: boolean } & Record<string, unknown>;
}

/** A vendor's MCP server: the tools it lists and the URLs it serves them at. */
export interface McpSpec {
  readonly format: 'mcp';
  readonly tools: readonly McpTool[];
  /** The URLs of the server's Streamable HTTP endpoint, e.g. `https://api.githubcopilot.com/mcp/`. */
  readonly endpoints: readonly string[];
}

export const isMcpSpec = (spec: unknown): spec is McpSpec =>
  typeof spec === 'object' &&
  spec !== null &&
  (spec as Partial<McpSpec>).format === 'mcp' &&
  Array.isArray((spec as Partial<McpSpec>).tools);

const JSON_HEADERS = { 'content-type': 'application/json' };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toolCallName = (message: JSONRPCMessage): string => {
  const params = 'params' in message ? message.params : undefined;
  return typeof params?.name === 'string' ? params.name : '';
};

const describe = (
  messages: readonly JSONRPCMessage[],
  tools: ReadonlyMap<string, McpTool>,
  source: string | undefined
): Pick<ProtocolExchange, 'operations' | 'messages'> => {
  const operations: NamedOperation[] = [];
  const names: string[] = [];
  const at = source === undefined ? {} : { source };
  for (const message of messages) {
    const method = 'method' in message ? message.method : undefined;
    if (method === 'tools/call') {
      const tool = toolCallName(message);
      const readOnly = tools.get(tool)?.annotations?.readOnlyHint === true;
      operations.push({ name: `tools/call ${tool}`, ...at, readOnly });
    } else if (method === 'tools/list') {
      operations.push({ name: 'tools/list', ...at, readOnly: true });
    } else if (method) {
      names.push(method);
    }
  }
  return { operations, messages: names };
};

const notAllowed = (method: string): ProtocolExchange => ({
  response: {
    statusCode: 405,
    headers: { ...JSON_HEADERS, allow: 'POST' },
    body: {
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed.' },
      id: null,
    },
  },
  operations: [],
  // Streamable HTTP lets stateless servers refuse the event stream and session deletion.
  messages: [method === 'get' ? 'GET event stream' : `${method.toUpperCase()} session`],
  requestViolations: [],
});

interface TransportError {
  readonly statusCode: number;
  /** The JSON-RPC error code. */
  readonly code: number;
  readonly violation: Violation;
}

const transportError = (
  statusCode: number,
  code: number,
  path: string[],
  message: string
): TransportError => ({ statusCode, code, violation: { path, code: 'transport', message } });

const rejected = ({ statusCode, code, violation: { message } }: TransportError) => ({
  statusCode,
  headers: JSON_HEADERS,
  body: { jsonrpc: '2.0', error: { code, message }, id: null },
});

// The checks a Streamable HTTP server makes before it reads a POST's JSON-RPC messages.
const readMessages = ({
  headers,
  body,
}: ContractRequest): { messages: JSONRPCMessage[]; batch: boolean } | TransportError => {
  const accepted = headers.accept ?? '';
  if (!accepted.includes('application/json') || !accepted.includes('text/event-stream')) {
    const message = 'The Accept header must name both application/json and text/event-stream';
    return transportError(406, -32000, ['headers', 'accept'], message);
  }
  if (!/application\/json/.test(headers['content-type'] ?? '')) {
    const message = 'The Content-Type must be application/json';
    return transportError(415, -32000, ['headers', 'content-type'], message);
  }
  if (typeof body === 'string' || body === undefined) {
    return transportError(400, -32700, ['body'], 'The body is not JSON');
  }
  const batch = Array.isArray(body);
  const candidates = batch ? body : [body];
  const parsed = candidates.map((candidate) => JSONRPCMessageSchema.safeParse(candidate));
  if (candidates.length === 0 || parsed.some(({ success }) => !success)) {
    return transportError(400, -32600, ['body'], 'The body is not a JSON-RPC message or batch');
  }
  return { messages: parsed.flatMap(({ data }) => (data ? [data] : [])), batch };
};

interface LoadedTool {
  readonly tool: McpTool;
  /** The tool's schemas resolve their refs within it, e.g. `#/$defs/...` of its inputSchema. */
  readonly spec: ContractSpec;
}

// Servers written in Go, such as GitHub's, list tools without one as `outputSchema: null`.
const withoutNullOutputSchema = ({ outputSchema, ...tool }: McpTool): McpTool =>
  isRecord(outputSchema) ? { ...tool, outputSchema } : tool;

const loadTools = (tools: readonly McpTool[]): Map<string, LoadedTool> => {
  const loaded = new Map<string, LoadedTool>();
  for (const listed of tools) {
    const tool = withoutNullOutputSchema(listed);
    if (!isRecord(tool.inputSchema)) {
      throw new Error(`The MCP tool ${tool.name} has no inputSchema object`);
    }
    if (loaded.has(tool.name)) {
      throw new Error(`The MCP spec lists the tool ${tool.name} more than once`);
    }
    loaded.set(tool.name, { tool, spec: { document: tool.inputSchema, dialect: 'draft-2020-12' } });
  }
  return loaded;
};

// Servers ignore arguments their tools don't declare, so a connector's misnamed argument has no
// effect; schemas that allow additional properties don't report them.
const findUndeclared = (
  { inputSchema }: McpTool,
  name: string,
  args: unknown,
  path: readonly string[]
): Violation[] => {
  const { properties, additionalProperties, patternProperties } = inputSchema;
  if (!isRecord(properties) || !isRecord(args) || additionalProperties || patternProperties) {
    return [];
  }
  return Object.keys(args)
    .filter((key) => !(key in properties))
    .map((key) => ({
      path: [...path, key],
      code: 'undeclared',
      message: `Argument ${key} is not declared by the tool ${name}`,
    }));
};

const findViolations = (
  loaded: LoadedTool | undefined,
  name: string,
  args: unknown
): Violation[] => {
  if (!loaded) {
    const message = `The server lists no tool named ${name}`;
    return [{ path: ['body', 'params', 'name'], code: 'tool', message }];
  }
  const { tool, spec } = loaded;
  const path = ['body', 'params', 'arguments'];
  const found = validateValue({ spec }, { pointer: '', schema: tool.inputSchema }, args ?? {}, {
    path,
    subject: `Arguments of ${name}`,
    direction: 'request',
  });
  return [...found, ...findUndeclared(tool, name, args, path)];
};

// `structuredContent` must be an object, though servers such as GitHub's declare arrays.
const toResult = ({ outputSchema }: McpTool) => {
  const value = outputSchema ? sampleJsonSchema(outputSchema) : {};
  const content = [{ type: 'text' as const, text: JSON.stringify(value) }];
  return outputSchema && isRecord(value) ? { content, structuredContent: value } : { content };
};

/**
 * Answers MCP's Streamable HTTP transport at the spec's endpoints, as a stateless server
 * listing the spec's tools. `tools/call` arguments are validated against each tool's
 * `inputSchema`; unknown tools and invalid arguments get JSON-RPC `InvalidParams` errors.
 * Results are a sample of the tool's `outputSchema` as JSON text, and as `structuredContent`
 * when it is an object. Throws when a tool has no `inputSchema` object or is listed twice.
 */
export const createMcpProtocol = (spec: McpSpec, source?: string): ContractProtocol => {
  const loadedTools = loadTools(spec.tools);
  const tools = new Map([...loadedTools].map(([name, { tool }]) => [name, tool]));

  const answer = async (
    messages: readonly JSONRPCMessage[],
    violations: Map<RequestId, Violation[]>
  ): Promise<JSONRPCMessage[]> => {
    const server = new Server(
      { name: 'connector-contract-mock', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    server.setRequestHandler(ListToolsRequestSchema, () => ({ tools: [...tools.values()] }));
    server.setRequestHandler(CallToolRequestSchema, ({ params }, { requestId }) => {
      const loaded = loadedTools.get(params.name);
      const found = findViolations(loaded, params.name, params.arguments);
      if (!loaded || found.length > 0) {
        violations.set(requestId, found);
        throw new McpError(ErrorCode.InvalidParams, found.map(({ message }) => message).join('; '));
      }
      return toResult(loaded.tool);
    });
    const transport = createExchangeTransport();
    await server.connect(transport);
    try {
      return await transport.exchange(messages);
    } finally {
      await server.close();
    }
  };

  return {
    endpoints: spec.endpoints.map((endpoint) => toEndpoint(new URL(endpoint))),
    handle: async (request) => {
      if (request.method !== 'post') {
        return notAllowed(request.method);
      }
      const read = readMessages(request);
      if ('statusCode' in read) {
        return { response: rejected(read), operations: [], requestViolations: [read.violation] };
      }
      const { messages, batch } = read;
      const violations = new Map<RequestId, Violation[]>();
      const replies = await answer(messages, violations);
      const requestViolations = messages.flatMap((message) =>
        isJSONRPCRequest(message) ? violations.get(message.id) ?? [] : []
      );
      const response: ContractResponse =
        replies.length === 0
          ? { statusCode: 202 }
          : { statusCode: 200, headers: JSON_HEADERS, body: batch ? replies : replies[0] };
      return { response, ...describe(messages, tools, source), requestViolations };
    },
  };
};
