/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { ContractMock } from '../fetch/create_contract_mock_fetch';
import { createContractMockFetch } from '../fetch/create_contract_mock_fetch';
import type { McpSpec } from './mcp_protocol';

const ENDPOINT = 'https://api.example.com/mcp/';

const spec: McpSpec = {
  format: 'mcp',
  endpoints: [ENDPOINT],
  tools: [
    {
      name: 'get_me',
      description: 'The authenticated user',
      inputSchema: { type: 'object', properties: {} },
      outputSchema: {
        type: 'object',
        properties: { login: { type: 'string' }, id: { type: 'integer' } },
        required: ['login', 'id'],
      },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'create_issue',
      inputSchema: {
        type: 'object',
        properties: {
          owner: { type: 'string' },
          title: { type: 'string', maxLength: 10 },
          labels: { type: 'array', items: { $ref: '#/$defs/label' } },
        },
        required: ['owner', 'title'],
        $defs: { label: { type: 'string', enum: ['bug', 'feature'] } },
      },
    },
  ],
};

const connect = async ({ fetch: mockFetch }: ContractMock): Promise<Client> => {
  const client = new Client({ name: 'test', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL(ENDPOINT), { fetch: mockFetch }));
  return client;
};

describe('MCP specs', () => {
  it('lists the tools and answers calls with a sample of their output schema', async () => {
    const mock = createContractMockFetch({ specs: { mcp: spec } });
    const client = await connect(mock);

    const { tools } = await client.listTools();
    const result = await client.callTool({ name: 'get_me', arguments: {} });
    await client.close();

    expect(tools.map(({ name }) => name)).toEqual(['get_me', 'create_issue']);
    expect(result).toEqual({
      content: [{ type: 'text', text: '{"login":"string","id":0}' }],
      structuredContent: { login: 'string', id: 0 },
    });
    const named = mock.calls.filter(({ matched }) => matched);
    expect(named).toEqual([
      expect.objectContaining({
        request: `POST ${ENDPOINT.slice(0, -1)}/`,
        operation: 'tools/list',
        matched: { name: 'tools/list', source: 'mcp' },
        readOnly: true,
        status: 200,
      }),
      expect.objectContaining({
        operation: 'tools/call get_me',
        matched: { name: 'tools/call get_me', source: 'mcp' },
        readOnly: true,
        requestViolations: [],
      }),
    ]);
    expect(mock.calls.filter(({ protocolMessage }) => protocolMessage)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ operation: 'initialize', status: 200 }),
        expect.objectContaining({ operation: 'notifications/initialized', status: 202 }),
      ])
    );
  });

  it('answers tools without an output schema with an empty JSON object', async () => {
    const mock = createContractMockFetch({ specs: [spec] });
    const client = await connect(mock);

    const result = await client.callTool({
      name: 'create_issue',
      arguments: { owner: 'elastic', title: 'Bug', labels: ['bug'] },
    });
    await client.close();

    expect(result.content).toEqual([{ type: 'text', text: '{}' }]);
    expect(mock.calls.find(({ operation }) => operation === 'tools/call create_issue')).toEqual(
      expect.objectContaining({ matched: { name: 'tools/call create_issue' }, readOnly: false })
    );
  });

  it('sends structuredContent only for object outputs, and ignores null output schemas', async () => {
    const tools = [
      {
        name: 'list_commits',
        inputSchema: { type: 'object' },
        outputSchema: { type: 'array', items: { type: 'string' } },
      },
      { name: 'list_tags', inputSchema: { type: 'object' }, outputSchema: null },
    ];
    // Snapshots of Go servers, such as GitHub's, are JSON with null output schemas.
    const nullable = JSON.parse(JSON.stringify(tools)) as McpSpec['tools'];
    const mock = createContractMockFetch({
      specs: [{ format: 'mcp', endpoints: [ENDPOINT], tools: nullable }],
    });
    const client = await connect(mock);

    // Listing tools is left out: the SDK client refuses output schemas that aren't objects.
    const commits = await client.callTool({ name: 'list_commits', arguments: {} });
    const tags = await client.callTool({ name: 'list_tags', arguments: {} });
    await client.close();
    const listed = await mock.fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });

    expect((await listed.json()).result.tools[1]).toEqual({
      name: 'list_tags',
      inputSchema: { type: 'object' },
    });
    expect(commits).toEqual({ content: [{ type: 'text', text: '["string"]' }] });
    expect(tags).toEqual({ content: [{ type: 'text', text: '{}' }] });
  });

  it.each([
    [
      'a tool without an inputSchema object',
      [{ name: 'list_tags', inputSchema: null }],
      'The MCP tool list_tags has no inputSchema object',
    ],
    [
      'a tool listed twice',
      [
        { name: 'get_me', inputSchema: { type: 'object' } },
        { name: 'get_me', inputSchema: { type: 'object' } },
      ],
      'The MCP spec lists the tool get_me more than once',
    ],
  ])('refuses specs with %s', (_, tools, message) => {
    const invalid = JSON.parse(JSON.stringify(tools)) as McpSpec['tools'];

    expect(() =>
      createContractMockFetch({ specs: [{ format: 'mcp', endpoints: [ENDPOINT], tools: invalid }] })
    ).toThrow(message);
  });

  it('rejects arguments that break the input schema, including referenced definitions', async () => {
    const mock = createContractMockFetch({ specs: [spec] });
    const client = await connect(mock);

    await expect(
      client.callTool({
        name: 'create_issue',
        arguments: { title: 'Far too long a title', labels: ['question'] },
      })
    ).rejects.toThrow(/Arguments of create_issue/);
    await client.close();

    const call = mock.calls.find(({ operation }) => operation === 'tools/call create_issue');
    expect(call?.requestViolations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: ['body', 'params', 'arguments'], code: 'required' }),
        expect.objectContaining({
          path: ['body', 'params', 'arguments', 'title'],
          code: 'maxLength',
        }),
        expect.objectContaining({
          path: ['body', 'params', 'arguments', 'labels', '0'],
          code: 'enum',
        }),
      ])
    );
  });

  it('rejects calls to tools the server does not list', async () => {
    const mock = createContractMockFetch({ specs: [spec] });
    const client = await connect(mock);

    await expect(client.callTool({ name: 'delete_repo', arguments: {} })).rejects.toThrow(
      /no tool named delete_repo/
    );
    await client.close();

    expect(mock.calls.find(({ operation }) => operation === 'tools/call delete_repo')).toEqual(
      expect.objectContaining({
        readOnly: false,
        requestViolations: [expect.objectContaining({ path: ['body', 'params', 'name'] })],
      })
    );
  });

  it('reports arguments the tool does not declare, which servers ignore', async () => {
    const mock = createContractMockFetch({ specs: [spec] });
    const client = await connect(mock);

    await expect(
      client.callTool({
        name: 'create_issue',
        arguments: { owner: 'elastic', title: 'Bug', first: 5 },
      })
    ).rejects.toThrow(/first is not declared/);
    await client.close();

    const call = mock.calls.find(({ operation }) => operation === 'tools/call create_issue');
    expect(call?.requestViolations).toEqual([
      expect.objectContaining({
        path: ['body', 'params', 'arguments', 'first'],
        code: 'undeclared',
      }),
    ]);
  });

  const post = (headers: Record<string, string>, body: unknown) => ({
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  const LIST = { jsonrpc: '2.0', id: 1, method: 'tools/list' };

  it.each([
    ['an Accept header without event streams', { accept: 'application/json' }, LIST, 406, 'accept'],
    ['a body that is not JSON', { 'content-type': 'text/plain' }, LIST, 415, 'content-type'],
    ['a message that is not JSON-RPC', {}, { id: 1, method: 'tools/list' }, 400, undefined],
  ])('reports requests with %s', async (_, headers, body, status, header) => {
    const { fetch: mockFetch, calls } = createContractMockFetch({ specs: [spec] });

    const response = await mockFetch(ENDPOINT, post(headers, body));

    expect(response.status).toBe(status);
    expect(calls[0].requestViolations).toEqual([
      expect.objectContaining({ code: 'transport', path: header ? ['headers', header] : ['body'] }),
    ]);
  });

  it('accepts notifications with 202 and answers batches with a batch', async () => {
    const { fetch: mockFetch } = createContractMockFetch({ specs: [spec] });

    const notified = await mockFetch(
      ENDPOINT,
      post({}, { jsonrpc: '2.0', method: 'notifications/initialized' })
    );
    const batch = await mockFetch(ENDPOINT, post({}, [LIST, { ...LIST, id: 2 }]));

    expect(notified.status).toBe(202);
    expect((await batch.json()).map(({ id }: { id: number }) => id)).toEqual([1, 2]);
  });

  it('refuses the event stream, as stateless servers may', async () => {
    const { fetch: mockFetch, calls } = createContractMockFetch({ specs: [spec] });

    const response = await mockFetch(ENDPOINT, { headers: { accept: 'text/event-stream' } });

    expect(response.status).toBe(405);
    expect(calls).toEqual([
      expect.objectContaining({ operation: 'GET event stream', protocolMessage: true }),
    ]);
  });
});
