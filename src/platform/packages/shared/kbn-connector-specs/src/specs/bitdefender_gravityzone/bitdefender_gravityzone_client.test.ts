/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Client-level HTTP and JSON-RPC error handling tests for the Bitdefender GravityZone connector.
 * Retry behaviour on 429 and 5xx is handled by the Kibana Actions framework; the connector
 * throws immediately so the framework can decide whether to retry.
 */

import { BitdefenderGravityzone } from './bitdefender_gravityzone';

const ENDPOINT_ID = '5a6b7c8d9e0f1a2b3c4d5e6f';
const QUARANTINE_ID = 'q-item-001';

const makeClient = (defaultsTimeout?: number) => ({
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  request: jest.fn(),
  defaults: defaultsTimeout !== undefined ? { timeout: defaultsTimeout } : {},
});

type MockClient = ReturnType<typeof makeClient>;

const makeCtx = (client: MockClient, configOverride?: Record<string, unknown>) => ({
  client,
  config: configOverride ?? { accessUrl: 'https://cloudap.gravityzone.bitdefender.com/api' },
  secrets: { Authorization: 'test-api-key-123' },
  log: { debug: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() },
});

const stubJsonRpcOk = (client: MockClient, result: unknown) => {
  client.request.mockResolvedValue({
    status: 200,
    headers: { 'content-type': 'application/json' },
    data: { jsonrpc: '2.0', id: '1', result },
  });
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// HTTP error handling — connector throws immediately; framework handles retries
// ---------------------------------------------------------------------------

describe('Bitdefender GravityZone HTTP error handling', () => {
  it('throws an error on HTTP 429 (framework handles retry)', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    client.request.mockResolvedValueOnce({
      status: 429,
      headers: { 'content-type': 'application/json', 'retry-after': '5' },
      data: {},
    });

    const handler = BitdefenderGravityzone.actions.searchEndpoints.handler;
    await expect(handler(ctx as any, {})).rejects.toThrow();
    expect(client.request).toHaveBeenCalledTimes(1);
  });

  it('throws an error on HTTP 500 (framework handles retry)', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    client.request.mockResolvedValueOnce({
      status: 500,
      headers: { 'content-type': 'application/json' },
      data: {},
    });

    const handler = BitdefenderGravityzone.actions.searchEndpoints.handler;
    await expect(handler(ctx as any, {})).rejects.toThrow('GravityZone API error (HTTP 500)');
    expect(client.request).toHaveBeenCalledTimes(1);
  });

  it('throws an error on HTTP 502', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    client.request.mockResolvedValueOnce({
      status: 502,
      headers: { 'content-type': 'application/json' },
      data: {},
    });

    const handler = BitdefenderGravityzone.actions.searchEndpoints.handler;
    await expect(handler(ctx as any, {})).rejects.toThrow('GravityZone API error (HTTP 502)');
    expect(client.request).toHaveBeenCalledTimes(1);
  });

  it('throws an error on HTTP 503', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    client.request.mockResolvedValueOnce({
      status: 503,
      headers: { 'content-type': 'application/json' },
      data: {},
    });

    const handler = BitdefenderGravityzone.actions.searchEndpoints.handler;
    await expect(handler(ctx as any, {})).rejects.toThrow('GravityZone API error (HTTP 503)');
    expect(client.request).toHaveBeenCalledTimes(1);
  });

  it('throws an error on HTTP 504', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    client.request.mockResolvedValueOnce({
      status: 504,
      headers: { 'content-type': 'application/json' },
      data: {},
    });

    const handler = BitdefenderGravityzone.actions.searchEndpoints.handler;
    await expect(handler(ctx as any, {})).rejects.toThrow('GravityZone API error (HTTP 504)');
    expect(client.request).toHaveBeenCalledTimes(1);
  });

  it('throws an error on HTTP 400 (not retried)', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    client.request.mockResolvedValueOnce({
      status: 400,
      headers: { 'content-type': 'application/json' },
      data: {},
    });

    const handler = BitdefenderGravityzone.actions.searchEndpoints.handler;
    await expect(handler(ctx as any, {})).rejects.toThrow();
    expect(client.request).toHaveBeenCalledTimes(1);
  });

  it('surfaces HTTP 401 as a readable auth error', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    client.request.mockResolvedValueOnce({
      status: 401,
      headers: { 'content-type': 'application/json' },
      data: {},
    });

    const handler = BitdefenderGravityzone.actions.searchEndpoints.handler;
    await expect(handler(ctx as any, {})).rejects.toThrow('Invalid or expired API key');
    expect(client.request).toHaveBeenCalledTimes(1);
  });

  it('surfaces HTTP 403 as a readable permissions error', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    client.request.mockResolvedValueOnce({
      status: 403,
      headers: { 'content-type': 'application/json' },
      data: {},
    });

    const handler = BitdefenderGravityzone.actions.searchEndpoints.handler;
    await expect(handler(ctx as any, {})).rejects.toThrow('Insufficient permissions');
    expect(client.request).toHaveBeenCalledTimes(1);
  });

  it('throws immediately on 5xx for state-changing calls (no special write protection needed)', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    client.request.mockResolvedValueOnce({
      status: 500,
      headers: { 'content-type': 'application/json' },
      data: {},
    });

    const handler = BitdefenderGravityzone.actions.isolateEndpoint.handler;
    await expect(handler(ctx as any, { endpointIds: [ENDPOINT_ID] })).rejects.toThrow();
    expect(client.request).toHaveBeenCalledTimes(1);
  });

  it('sets maxRedirects: 0 on every request to prevent token forwarding on redirects', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    stubJsonRpcOk(client, { items: [], page: 1, pagesCount: 0, perPage: 1, total: 0 });

    await BitdefenderGravityzone.test.handler(ctx as any);
    const call = client.request.mock.calls[0][0];
    expect(call.maxRedirects).toBe(0);
  });

  it('uses min(30s, ctx.client.defaults.timeout) for the request timeout', async () => {
    const client = makeClient(10_000); // framework configured 10 s
    const ctx = makeCtx(client);
    stubJsonRpcOk(client, { items: [], page: 1, pagesCount: 0, perPage: 1, total: 0 });

    await BitdefenderGravityzone.test.handler(ctx as any);
    const call = client.request.mock.calls[0][0];
    expect(call.timeout).toBe(10_000); // min(30_000, 10_000)
  });

  it('uses the connector own 30s timeout when ctx.client.defaults.timeout is unset', async () => {
    const client = makeClient(); // no timeout configured
    const ctx = makeCtx(client);
    stubJsonRpcOk(client, { items: [], page: 1, pagesCount: 0, perPage: 1, total: 0 });

    await BitdefenderGravityzone.test.handler(ctx as any);
    const call = client.request.mock.calls[0][0];
    expect(call.timeout).toBe(30_000);
  });

  it('uses the connector own 30s timeout when ctx.client.defaults.timeout is higher', async () => {
    const client = makeClient(60_000); // framework configured 60 s
    const ctx = makeCtx(client);
    stubJsonRpcOk(client, { items: [], page: 1, pagesCount: 0, perPage: 1, total: 0 });

    await BitdefenderGravityzone.test.handler(ctx as any);
    const call = client.request.mock.calls[0][0];
    expect(call.timeout).toBe(30_000); // min(30_000, 60_000)
  });
});

// ---------------------------------------------------------------------------
// JSON-RPC error handling
// ---------------------------------------------------------------------------

describe('Bitdefender GravityZone JSON-RPC error handling', () => {
  it('extracts error.code and error.message from an HTTP 200 body', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    client.request.mockResolvedValueOnce({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: {
        jsonrpc: '2.0',
        id: '1',
        error: { code: -32602, message: 'Invalid params: perPage must be <= 100' },
      },
    });

    const handler = BitdefenderGravityzone.actions.searchEndpoints.handler;
    await expect(handler(ctx as any, {})).rejects.toThrow('Invalid parameters');
  });

  it('maps JSON-RPC -32001 (auth error) to a readable message', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    client.request.mockResolvedValueOnce({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: { jsonrpc: '2.0', id: '1', error: { code: -32001, message: 'Unauthorized' } },
    });

    const handler = BitdefenderGravityzone.actions.searchEndpoints.handler;
    await expect(handler(ctx as any, {})).rejects.toThrow('Authorization error');
    expect(client.request).toHaveBeenCalledTimes(1);
  });

  it('maps JSON-RPC -32002 (not found) to a readable message', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    client.request.mockResolvedValueOnce({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: { jsonrpc: '2.0', id: '1', error: { code: -32002, message: 'Object not found' } },
    });

    const handler = BitdefenderGravityzone.actions.getEndpoint.handler;
    await expect(handler(ctx as any, { endpointId: ENDPOINT_ID })).rejects.toThrow('Not found');
    expect(client.request).toHaveBeenCalledTimes(1);
  });

  it('maps JSON-RPC -32602 (invalid params) to a readable message', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    client.request.mockResolvedValueOnce({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: { jsonrpc: '2.0', id: '1', error: { code: -32602, message: 'Invalid params' } },
    });

    const handler = BitdefenderGravityzone.actions.searchEndpoints.handler;
    await expect(handler(ctx as any, {})).rejects.toThrow('Invalid parameters');
    expect(client.request).toHaveBeenCalledTimes(1);
  });

  it('throws on JSON-RPC -32003 (transient service error) so the framework can retry', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    client.request.mockResolvedValueOnce({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: { jsonrpc: '2.0', id: '1', error: { code: -32003, message: 'Temporary service error' } },
    });

    const handler = BitdefenderGravityzone.actions.searchEndpoints.handler;
    await expect(handler(ctx as any, {})).rejects.toThrow('GravityZone API error (code -32003)');
    expect(client.request).toHaveBeenCalledTimes(1);
  });

  it('401 surfaces as auth error without retry (API keys do not expire and are not refreshed)', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    client.request.mockResolvedValueOnce({
      status: 401,
      headers: { 'content-type': 'application/json' },
      data: {},
    });

    const handler = BitdefenderGravityzone.actions.searchEndpoints.handler;
    await expect(handler(ctx as any, {})).rejects.toThrow('Invalid or expired API key');
    expect(client.request).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// HTML error page detection
// ---------------------------------------------------------------------------

describe('Bitdefender GravityZone HTML error page detection', () => {
  it('detects Content-Type text/html and surfaces as a connector error', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    client.request.mockResolvedValueOnce({
      status: 502,
      headers: { 'content-type': 'text/html' },
      data: '<html><body><h1>Bad Gateway</h1></body></html>',
    });

    const handler = BitdefenderGravityzone.actions.searchEndpoints.handler;
    await expect(handler(ctx as any, {})).rejects.toThrow('HTML error page');
  });

  it('truncates long HTML bodies in the error message', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    const longHtml = '<html>' + 'x'.repeat(1000) + '</html>';
    client.request.mockResolvedValueOnce({
      status: 502,
      headers: { 'content-type': 'text/html' },
      data: longHtml,
    });

    const handler = BitdefenderGravityzone.actions.searchEndpoints.handler;
    const err = await handler(ctx as any, {}).catch((e: Error) => e);
    expect((err as Error).message.length).toBeLessThan(600);
  });
});

// ---------------------------------------------------------------------------
// Quarantine result=false handling
// ---------------------------------------------------------------------------

describe('Bitdefender GravityZone quarantine result=false handling', () => {
  it('throws on result=false from deleteQuarantineItem', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    client.request.mockResolvedValueOnce({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: { jsonrpc: '2.0', id: '1', result: false },
    });

    const handler = BitdefenderGravityzone.actions.deleteQuarantineItem.handler;
    await expect(handler(ctx as any, { quarantineItemsIds: [QUARANTINE_ID] })).rejects.toThrow(
      'Task creation was unsuccessful'
    );
  });

  it('throws on result=false from restoreQuarantineItem', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    client.request.mockResolvedValueOnce({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: { jsonrpc: '2.0', id: '1', result: false },
    });

    const handler = BitdefenderGravityzone.actions.restoreQuarantineItem.handler;
    await expect(
      handler(ctx as any, { quarantineItemsIds: [QUARANTINE_ID] })
    ).rejects.toThrow('Task creation was unsuccessful');
  });
});

// ---------------------------------------------------------------------------
// Batch partial failure
// ---------------------------------------------------------------------------

describe('Bitdefender GravityZone batch partial failure', () => {
  it('isolation returns a task ID; per-endpoint subtask errors are visible via getTask returnSubtasks=true', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);

    stubJsonRpcOk(client, ['task-id-batch-001']);
    const isolateResult = await BitdefenderGravityzone.actions.isolateEndpoint.handler(
      ctx as any,
      { endpointIds: [ENDPOINT_ID, ENDPOINT_ID.replace(/.$/, '0')] }
    );
    expect(Array.isArray(isolateResult)).toBe(true);

    stubJsonRpcOk(client, {
      status: 2,
      subtasks: [
        { endpointId: ENDPOINT_ID, status: 3, statusMessage: 'Completed' },
        { endpointId: ENDPOINT_ID.replace(/.$/, '0'), status: 4, statusMessage: 'Failed: not found' },
      ],
    });
    const taskResult = await BitdefenderGravityzone.actions.getTask.handler(ctx as any, {
      taskId: 'task-id-batch-001',
      returnSubtasks: true,
    });
    expect((taskResult as any).subtasks).toHaveLength(2);
  });
});
