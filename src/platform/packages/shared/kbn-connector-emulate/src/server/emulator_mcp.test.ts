/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenApiDocument } from '../openapi';
import { createEmulatorFetch } from '../fetch/create_emulator_fetch';
import { createEmulatorMcpHandler } from './emulator_mcp';

const spec: OpenApiDocument = {
  openapi: '3.0.3',
  info: { title: 'Vendor', version: '1' },
  servers: [{ url: 'https://api.vendor.example/v1' }],
  paths: {
    '/items': {
      get: {
        operationId: 'listItems',
        responses: {
          '200': {
            description: 'The items',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['id'],
                    properties: { id: { type: 'integer' } },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

const ITEMS = 'https://api.vendor.example/v1/items';
const listItems = { method: 'GET', path: '/items' };

const post = (body: unknown, accept = 'application/json, text/event-stream') =>
  new Request('http://emulator.invalid/_mock/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept },
    body: JSON.stringify(body),
  });

describe('createEmulatorMcpHandler', () => {
  let emulator: ReturnType<typeof createEmulatorFetch>;
  let handle: ReturnType<typeof createEmulatorMcpHandler>;
  let nextId: number;

  const callTool = async (name: string, args: Record<string, unknown> = {}) => {
    const response = await handle(
      post({
        jsonrpc: '2.0',
        id: nextId++,
        method: 'tools/call',
        params: { name, arguments: args },
      })
    );
    const { result } = await response.json();
    return { isError: result.isError === true, value: result.content[0].text };
  };
  const parsed = async (name: string, args: Record<string, unknown> = {}) =>
    JSON.parse((await callTool(name, args)).value);

  beforeEach(() => {
    emulator = createEmulatorFetch({ specs: [spec] });
    handle = createEmulatorMcpHandler(emulator);
    nextId = 1;
  });

  it('initializes with instructions, and lists its tools', async () => {
    const initialize = await handle(
      post({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'test', version: '1' },
        },
      })
    );
    const { result } = await initialize.json();
    expect(result.serverInfo.name).toBe('connector-emulator-control');
    expect(result.instructions).toContain('set_fixtures');

    const list = await handle(post({ jsonrpc: '2.0', id: 2, method: 'tools/list' }));
    expect((await list.json()).result.tools.map(({ name }: { name: string }) => name)).toEqual([
      'list_operations',
      'describe_operation',
      'set_fixtures',
      'list_fixtures',
      'clear_fixtures',
      'list_calls',
      'reset',
    ]);
  });

  it('lists and describes operations', async () => {
    expect(await parsed('list_operations', { search: 'ITEMS' })).toEqual([
      expect.objectContaining({ id: 'listItems', method: 'GET', path: '/items' }),
    ]);
    expect(await parsed('list_operations', { search: 'users' })).toEqual([]);
    expect((await parsed('describe_operation', { id: 'listItems' })).responses[0]).toMatchObject({
      status: '200',
      contents: [{ sample: [{ id: 0 }] }],
    });
    expect(await callTool('describe_operation', { id: 'getItem' })).toEqual({
      isError: true,
      value: expect.stringContaining('No OpenAPI operation has the id getItem'),
    });
  });

  it('sets fixtures the emulator answers with, and shows them in the calls', async () => {
    expect(
      await parsed('set_fixtures', {
        fixtures: [{ operation: listItems, response: { status: 200, body: [{ id: 7 }] } }],
      })
    ).toEqual({ fixtures: [expect.objectContaining({ operation: listItems })] });

    expect(await (await emulator.fetch(ITEMS)).json()).toEqual([{ id: 7 }]);
    expect(await parsed('list_calls')).toEqual({
      calls: [
        expect.objectContaining({ operation: 'listItems', responseSource: 'runtime-fixture' }),
      ],
      total: 1,
    });
    expect((await parsed('list_calls', { since: 1 })).calls).toEqual([]);
  });

  it('reports fixtures the spec rejects, and malformed ones, as tool errors', async () => {
    const rejected = await callTool('set_fixtures', {
      fixtures: [{ operation: listItems, response: { status: 200, body: [{ name: 'no id' }] } }],
    });
    expect(rejected.isError).toBe(true);
    expect(rejected.value).toContain('none was set');
    expect(rejected.value).toContain('"code": "required"');

    const malformed = await callTool('set_fixtures', { fixtures: [{ response: { status: 200 } }] });
    expect(malformed).toEqual({ isError: true, value: expect.stringContaining('operation') });
    expect(emulator.runtimeFixtures.list()).toEqual([]);
  });

  it('clears fixtures and resets the emulator', async () => {
    emulator.runtimeFixtures.set([{ operation: listItems, response: { status: 429 } }]);
    await emulator.fetch(ITEMS);

    expect(await parsed('list_fixtures')).toEqual({ fixtures: [expect.anything()] });
    expect(await parsed('clear_fixtures', { id: 'listItems' })).toEqual({ fixtures: [] });

    emulator.runtimeFixtures.set([{ operation: listItems, response: { status: 429 } }]);
    await parsed('reset');
    expect(emulator.calls).toEqual([]);
    expect(emulator.runtimeFixtures.list()).toEqual([]);
  });

  it('offers export_fixtures when given a way to export them', async () => {
    const exportFixtures = jest.fn(async () => 'vendor_api/fixtures.json');
    handle = createEmulatorMcpHandler(emulator, { exportFixtures });
    emulator.runtimeFixtures.set([{ operation: listItems, response: { status: 200, body: [] } }]);

    expect(await parsed('export_fixtures')).toEqual({ exportedTo: 'vendor_api/fixtures.json' });
    expect(exportFixtures).toHaveBeenCalledWith([
      expect.objectContaining({ operation: listItems }),
    ]);
  });

  it('reports each request to onRequest, tool calls with what they did', async () => {
    const onRequest = jest.fn();
    handle = createEmulatorMcpHandler(emulator, { onRequest });

    await handle(
      post({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'claude-code', version: '2.1.0' },
        },
      })
    );
    await handle(post({ jsonrpc: '2.0', id: 2, method: 'tools/list' }));
    await callTool('set_fixtures', {
      fixtures: [{ operation: listItems, response: { status: 429 } }],
    });
    await callTool('describe_operation', { id: 'getItem' });

    expect(onRequest.mock.calls.map(([request]) => request)).toEqual([
      { method: 'initialize', client: 'claude-code 2.1.0' },
      { method: 'tools/list' },
      {
        method: 'tools/call',
        tool: 'set_fixtures',
        arguments: { fixtures: [{ operation: listItems, response: { status: 429 } }] },
        isError: false,
        summary: '1 fixture in effect',
      },
      {
        method: 'tools/call',
        tool: 'describe_operation',
        arguments: { id: 'getItem' },
        isError: true,
        summary: 'No OpenAPI operation has the id getItem; list_operations shows the ids',
      },
    ]);
  });

  it('answers as a stateless Streamable HTTP server', async () => {
    const notification = await handle(
      post({ jsonrpc: '2.0', method: 'notifications/initialized' })
    );
    expect(notification.status).toBe(202);

    const stream = await handle(new Request('http://emulator.invalid/_mock/mcp'));
    expect(stream.status).toBe(405);
    expect(stream.headers.get('allow')).toBe('POST');

    const notAccepted = await handle(post({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, '*/*'));
    expect(notAccepted.status).toBe(406);
  });
});
