/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Behavior matrix tests for state-changing actions.
 *
 * S2: unknown-id-alone -- the vendor's JSON-RPC error is surfaced
 * S6: vendor-error -- partial or per-item errors from the vendor
 * S7: repeat-call -- a second identical call succeeds
 *
 * Scenarios that need a pre-read (S1 already-in-state, S4 all-in-state) are
 * marked n/a in the behavior matrix because GravityZone's task-based API does
 * not expose per-endpoint state before the write, and the per-endpoint lookup
 * (getManagedEndpointDetails) does not scale to the 1000-ID limit.
 */

import { BitdefenderGravityzone } from './bitdefender_gravityzone';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCESS_URL = 'https://cloudap.gravityzone.bitdefender.com/api';
const ENDPOINT_ID = '5a6b7c8d9e0f1a2b3c4d5e6f';
const TASK_ID = 'abc123-task-id';
const QUARANTINE_ID = 'q-item-001';

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

const makeClient = () => ({
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  request: jest.fn(),
  defaults: {},
});

type MockClient = ReturnType<typeof makeClient>;

const makeCtx = (client: MockClient) => ({
  client,
  config: { accessUrl: ACCESS_URL },
  secrets: { Authorization: 'test-api-key-123' },
  log: { debug: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() },
});

const stubJsonRpc = (client: MockClient, result: unknown) => {
  client.request.mockResolvedValue({
    status: 200,
    headers: { 'content-type': 'application/json' },
    data: { jsonrpc: '2.0', id: '1', result },
  });
};

const stubJsonRpcError = (client: MockClient, code: number, message: string) => {
  client.request.mockResolvedValue({
    status: 200,
    headers: { 'content-type': 'application/json' },
    data: { jsonrpc: '2.0', id: '1', error: { code, message } },
  });
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Behavior matrix scenarios
// ---------------------------------------------------------------------------

describe('Bitdefender GravityZone behavior matrix', () => {
  // S2: unknown ID alone -- vendor returns JSON-RPC error, connector surfaces it
  it.each([
    ['isolateEndpoint', { endpointIds: ['000000000000000000000000'] }],
    ['restoreEndpointFromIsolation', { endpointIds: ['000000000000000000000000'] }],
    ['scanEndpoint', { targetIds: ['000000000000000000000000'], type: 1 }],
    ['quarantineFile', { endpointIds: ['000000000000000000000000'], filePath: '/tmp/x.exe' }],
    ['restoreQuarantineItem', { quarantineItemsIds: ['nonexistent-id'] }],
    ['deleteQuarantineItem', { quarantineItemsIds: ['nonexistent-id'] }],
  ] as Array<[string, Record<string, unknown>]>)(
    '%s unknown-id-alone: vendor error is surfaced',
    async (actionName, input) => {
      const client = makeClient();
      const ctx = makeCtx(client);
      stubJsonRpcError(client, -32602, 'Invalid parameter: unknown ID');
      const handler = BitdefenderGravityzone.actions[actionName].handler;
      await expect(handler(ctx as any, input)).rejects.toThrow();
    }
  );

  // S7: repeat call -- second identical call succeeds
  it.each([
    ['isolateEndpoint', { endpointIds: [ENDPOINT_ID] }, [TASK_ID]],
    ['restoreEndpointFromIsolation', { endpointIds: [ENDPOINT_ID] }, [TASK_ID]],
    ['scanEndpoint', { targetIds: [ENDPOINT_ID], type: 1 }, TASK_ID],
    ['quarantineFile', { endpointIds: [ENDPOINT_ID], filePath: '/tmp/x.exe' }, [TASK_ID]],
    ['restoreQuarantineItem', { quarantineItemsIds: [QUARANTINE_ID] }, true],
    ['deleteQuarantineItem', { quarantineItemsIds: [QUARANTINE_ID] }, true],
    ['addToBlocklist', { hashType: 1, hashList: ['a'.repeat(64)], sourceInfo: 'test' }, true],
    ['removeFromBlocklist', { hashItemId: 'item-1' }, true],
  ] as Array<[string, Record<string, unknown>, unknown]>)(
    '%s repeat-call: second identical call succeeds',
    async (actionName, input, mockResult) => {
      const client = makeClient();
      const ctx = makeCtx(client);
      stubJsonRpc(client, mockResult);
      const handler = BitdefenderGravityzone.actions[actionName].handler;
      await handler(ctx as any, input);
      // second identical call also succeeds
      stubJsonRpc(client, mockResult);
      const r2 = await handler(ctx as any, input);
      expect(r2).toBeDefined();
    }
  );

  // S6: vendor-error for addToBlocklist and removeFromBlocklist
  it('addToBlocklist vendor-error: JSON-RPC error is surfaced', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    stubJsonRpcError(client, -32602, 'Invalid hash format');
    const handler = BitdefenderGravityzone.actions.addToBlocklist.handler;
    await expect(
      handler(ctx as any, { hashType: 1, hashList: ['bad'], sourceInfo: 'test' })
    ).rejects.toThrow('Invalid parameters');
  });

  it('removeFromBlocklist vendor-error: JSON-RPC not-found is surfaced', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    stubJsonRpcError(client, -32002, 'Item not found');
    const handler = BitdefenderGravityzone.actions.removeFromBlocklist.handler;
    await expect(handler(ctx as any, { hashItemId: 'nonexistent' })).rejects.toThrow('Not found');
  });
});
