/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getConnectorSpec } from '../../..';
import { BitdefenderGravityzone } from './bitdefender_gravityzone';
import {
  SearchEndpointsInputSchema,
  GetEndpointInputSchema,
  IsolateEndpointInputSchema,
  RestoreEndpointFromIsolationInputSchema,
  ScanEndpointInputSchema,
  GetTaskInputSchema,
  ListQuarantineItemsInputSchema,
  RestoreQuarantineItemInputSchema,
  DeleteQuarantineItemInputSchema,
  QuarantineFileInputSchema,
  AddToBlocklistInputSchema,
  GetBlocklistItemsInputSchema,
  RemoveFromBlocklistInputSchema,
  ListGroupsInputSchema,
  ListPoliciesInputSchema,
} from './types';
import type { AuthTypeDef } from '../../connector_spec';

// Constants

const ACCESS_URL = 'https://cloudap.gravityzone.bitdefender.com/api';
const ENDPOINT_ID = '5a6b7c8d9e0f1a2b3c4d5e6f';
const TASK_ID = 'abc123-task-id';
const QUARANTINE_ID = 'q-item-001';

// Mock helpers

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

const makeCtx = (client: MockClient, configOverride?: Record<string, unknown>) => ({
  client,
  config: configOverride ?? { accessUrl: ACCESS_URL },
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

const isAuthTypeDef = (t: string | AuthTypeDef): t is AuthTypeDef => typeof t === 'object';

beforeEach(() => {
  jest.clearAllMocks();
});

// Metadata and registration

describe('Bitdefender GravityZone metadata', () => {
  it('is discoverable via getConnectorSpec', () => {
    expect(getConnectorSpec('.bitdefender_gravityzone')).toBe(BitdefenderGravityzone);
  });

  it('has the correct id and display name', () => {
    expect(BitdefenderGravityzone.metadata.id).toBe('.bitdefender_gravityzone');
    expect(BitdefenderGravityzone.metadata.displayName).toBe('Bitdefender GravityZone');
  });

  it('requires enterprise licence', () => {
    expect(BitdefenderGravityzone.metadata.minimumLicense).toBe('enterprise');
  });

  it('supports agentBuilder only', () => {
    expect(BitdefenderGravityzone.metadata.supportedFeatureIds).toEqual(['agentBuilder']);
    expect(BitdefenderGravityzone.metadata.supportedFeatureIds).not.toContain('workflows');
  });

  it('declares a non-empty description', () => {
    expect(typeof BitdefenderGravityzone.metadata.description).toBe('string');
    expect(BitdefenderGravityzone.metadata.description.length).toBeGreaterThan(10);
  });
});

// Auth

describe('Bitdefender GravityZone auth', () => {
  it('uses api_key_header auth type', () => {
    const authTypes = BitdefenderGravityzone.auth!.types;
    expect(authTypes.length).toBe(1);
    const apiKeyDef = authTypes.find(
      (t): t is AuthTypeDef => isAuthTypeDef(t) && t.type === 'api_key_header'
    );
    expect(apiKeyDef).toBeDefined();
  });

  it('sets Authorization as the header field', () => {
    const apiKeyDef = BitdefenderGravityzone.auth!.types[0] as AuthTypeDef;
    expect(apiKeyDef.defaults?.headerField).toBe('Authorization');
  });

  it('overrides the API key label', () => {
    const apiKeyDef = BitdefenderGravityzone.auth!.types[0] as AuthTypeDef;
    expect(apiKeyDef.overrides?.meta?.Authorization?.label).toBeDefined();
  });
});

// Schema

describe('Bitdefender GravityZone schema', () => {
  it('validates a correct accessUrl', () => {
    const schema = BitdefenderGravityzone.schema!;
    expect(
      schema.safeParse({ accessUrl: 'https://eu.gravityzone.bitdefender.com/api' }).success
    ).toBe(true);
  });

  it('rejects a non-URL accessUrl', () => {
    const schema = BitdefenderGravityzone.schema!;
    expect(schema.safeParse({ accessUrl: 'not-a-url' }).success).toBe(false);
  });

  it('rejects HTTP accessUrl (non-loopback)', () => {
    const schema = BitdefenderGravityzone.schema!;
    expect(
      schema.safeParse({ accessUrl: 'http://cloudap.gravityzone.bitdefender.com/api' }).success
    ).toBe(false);
  });

  it('allows HTTP for localhost (local emulator)', () => {
    const schema = BitdefenderGravityzone.schema!;
    expect(schema.safeParse({ accessUrl: 'http://localhost:18081' }).success).toBe(true);
  });

  it('marks accessUrl with allowedHosts validation for HTTPS enforcement', () => {
    const schema = BitdefenderGravityzone.schema!;
    const accessUrlMeta = schema.shape.accessUrl.meta();
    expect(accessUrlMeta?.validate?.allowedHosts).toBe(true);
  });

  it('rejects accessUrl with a query string', () => {
    const schema = BitdefenderGravityzone.schema!;
    expect(
      schema.safeParse({ accessUrl: 'https://cloudap.gravityzone.bitdefender.com/api?foo=bar' })
        .success
    ).toBe(false);
  });

  it('rejects accessUrl with a fragment', () => {
    const schema = BitdefenderGravityzone.schema!;
    expect(
      schema.safeParse({ accessUrl: 'https://cloudap.gravityzone.bitdefender.com/api#section' })
        .success
    ).toBe(false);
  });

  it('builds the full request URL by appending the service path to accessUrl pathname (trailing slash)', async () => {
    const client = makeClient();
    const ctx = makeCtx(client, { accessUrl: 'https://cloudap.gravityzone.bitdefender.com/api/' });
    stubJsonRpc(client, { items: [], page: 1, pagesCount: 0, perPage: 1, total: 0 });

    const handler = BitdefenderGravityzone.actions.searchEndpoints.handler;
    await handler(ctx as any, {});

    const call = client.request.mock.calls[0][0];
    expect(call.url).toBe('https://cloudap.gravityzone.bitdefender.com/api/v1.0/jsonrpc/network');
  });
});

// Input schema validation

describe('Bitdefender GravityZone input schemas', () => {
  it('searchEndpoints: accepts minimal input', () => {
    expect(SearchEndpointsInputSchema.safeParse({}).success).toBe(true);
  });

  it('searchEndpoints: accepts page and perPage', () => {
    expect(SearchEndpointsInputSchema.safeParse({ page: 2, perPage: 50 }).success).toBe(true);
  });

  it('searchEndpoints: rejects perPage > 100', () => {
    expect(SearchEndpointsInputSchema.safeParse({ perPage: 101 }).success).toBe(false);
  });

  it('getEndpoint: requires a 24-hex-char endpointId', () => {
    expect(GetEndpointInputSchema.safeParse({ endpointId: ENDPOINT_ID }).success).toBe(true);
    expect(GetEndpointInputSchema.safeParse({ endpointId: 'short' }).success).toBe(false);
    expect(GetEndpointInputSchema.safeParse({}).success).toBe(false);
  });

  it('isolateEndpoint: requires at least 1 and max 1000 endpointIds', () => {
    expect(IsolateEndpointInputSchema.safeParse({ endpointIds: [ENDPOINT_ID] }).success).toBe(true);
    expect(IsolateEndpointInputSchema.safeParse({ endpointIds: [] }).success).toBe(false);
  });

  it('restoreEndpointFromIsolation: requires endpointIds', () => {
    expect(
      RestoreEndpointFromIsolationInputSchema.safeParse({ endpointIds: [ENDPOINT_ID] }).success
    ).toBe(true);
  });

  it('scanEndpoint: requires targetIds and type', () => {
    expect(ScanEndpointInputSchema.safeParse({ targetIds: [ENDPOINT_ID], type: 1 }).success).toBe(
      true
    );
    expect(ScanEndpointInputSchema.safeParse({ targetIds: [ENDPOINT_ID] }).success).toBe(false);
    expect(ScanEndpointInputSchema.safeParse({ targetIds: [ENDPOINT_ID], type: 5 }).success).toBe(
      false
    );
  });

  it('getTask: requires taskId', () => {
    expect(GetTaskInputSchema.safeParse({ taskId: TASK_ID }).success).toBe(true);
    expect(GetTaskInputSchema.safeParse({}).success).toBe(false);
  });

  it('listQuarantineItems: accepts optional filters', () => {
    expect(ListQuarantineItemsInputSchema.safeParse({}).success).toBe(true);
    expect(
      ListQuarantineItemsInputSchema.safeParse({ endpointId: ENDPOINT_ID, page: 1, perPage: 50 })
        .success
    ).toBe(true);
  });

  it('restoreQuarantineItem: requires quarantineItemsIds', () => {
    expect(
      RestoreQuarantineItemInputSchema.safeParse({ quarantineItemsIds: [QUARANTINE_ID] }).success
    ).toBe(true);
  });

  it('deleteQuarantineItem: requires quarantineItemsIds', () => {
    expect(
      DeleteQuarantineItemInputSchema.safeParse({ quarantineItemsIds: [QUARANTINE_ID] }).success
    ).toBe(true);
  });

  it('quarantineFile: requires endpointIds and filePath', () => {
    expect(
      QuarantineFileInputSchema.safeParse({
        endpointIds: [ENDPOINT_ID],
        filePath: '/tmp/malware.exe',
      }).success
    ).toBe(true);
    expect(QuarantineFileInputSchema.safeParse({ endpointIds: [ENDPOINT_ID] }).success).toBe(false);
  });

  it('addToBlocklist: requires hashType, hashList and sourceInfo', () => {
    expect(
      AddToBlocklistInputSchema.safeParse({
        hashType: 1,
        hashList: ['abc123def456'],
        sourceInfo: 'Elastic SOAR',
      }).success
    ).toBe(true);
    expect(
      AddToBlocklistInputSchema.safeParse({ hashType: 3, hashList: ['x'], sourceInfo: 'y' }).success
    ).toBe(false);
  });

  it('getBlocklistItems: accepts optional pagination', () => {
    expect(GetBlocklistItemsInputSchema.safeParse({}).success).toBe(true);
    expect(GetBlocklistItemsInputSchema.safeParse({ page: 1, perPage: 100 }).success).toBe(true);
  });

  it('removeFromBlocklist: requires hashItemId', () => {
    expect(RemoveFromBlocklistInputSchema.safeParse({ hashItemId: 'item-1' }).success).toBe(true);
    expect(RemoveFromBlocklistInputSchema.safeParse({}).success).toBe(false);
  });

  it('listGroups: accepts optional parentId', () => {
    expect(ListGroupsInputSchema.safeParse({}).success).toBe(true);
    expect(ListGroupsInputSchema.safeParse({ parentId: ENDPOINT_ID }).success).toBe(true);
  });

  it('listPolicies: accepts optional pagination', () => {
    expect(ListPoliciesInputSchema.safeParse({}).success).toBe(true);
  });
});

// Test handler

describe('Bitdefender GravityZone test handler', () => {
  it('calls getNetworkInventoryItems', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    stubJsonRpc(client, { items: [], page: 1, pagesCount: 0, perPage: 1, total: 0 });

    const result = await BitdefenderGravityzone.test.handler(ctx as any);
    expect(result).toHaveProperty('result');
    expect(client.request).toHaveBeenCalledTimes(1);
    const call = client.request.mock.calls[0][0];
    expect(call.method).toBe('POST');
    expect(call.url).toContain('/v1.0/jsonrpc/network');
    const body = call.data;
    expect(body.method).toBe('getNetworkInventoryItems');
    expect(body.params).toEqual({ page: 1, perPage: 1 });
  });

  it('sends Basic auth header derived from the API key secret', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    stubJsonRpc(client, { items: [], page: 1, pagesCount: 0, perPage: 1, total: 0 });

    await BitdefenderGravityzone.test.handler(ctx as any);
    const call = client.request.mock.calls[0][0];
    const expectedHeader = `Basic ${Buffer.from('test-api-key-123:').toString('base64')}`;
    expect(call.headers.Authorization).toBe(expectedHeader);
  });
});

// Action handlers

describe('Bitdefender GravityZone actions', () => {
  it('searchEndpoints sends JSON-RPC to network path', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    const mockResult = {
      items: [{ id: ENDPOINT_ID, name: 'test-host' }],
      page: 1,
      pagesCount: 1,
      perPage: 30,
      total: 1,
    };
    stubJsonRpc(client, mockResult);

    const handler = BitdefenderGravityzone.actions.searchEndpoints.handler;
    const result = await handler(ctx as any, { page: 1, perPage: 30 });

    expect(result).toEqual(mockResult);
    const call = client.request.mock.calls[0][0];
    expect(call.data.method).toBe('getNetworkInventoryItems');
    expect(call.data.params).toEqual({ page: 1, perPage: 30 });
    expect(call.url).toContain('/v1.0/jsonrpc/network');
  });

  it('getEndpoint sends getManagedEndpointDetails', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    stubJsonRpc(client, { id: ENDPOINT_ID, name: 'test-host', isIsolated: false });

    const handler = BitdefenderGravityzone.actions.getEndpoint.handler;
    const result = await handler(ctx as any, { endpointId: ENDPOINT_ID });

    expect(result).toHaveProperty('id', ENDPOINT_ID);
    const call = client.request.mock.calls[0][0];
    expect(call.data.method).toBe('getManagedEndpointDetails');
    expect(call.data.params.endpointId).toBe(ENDPOINT_ID);
  });

  it('isolateEndpoint sends createIsolateEndpointTask to v1.1 incidents', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    stubJsonRpc(client, [TASK_ID]);

    const handler = BitdefenderGravityzone.actions.isolateEndpoint.handler;
    const result = await handler(ctx as any, { endpointIds: [ENDPOINT_ID] });

    expect(result).toEqual([TASK_ID]);
    const call = client.request.mock.calls[0][0];
    expect(call.data.method).toBe('createIsolateEndpointTask');
    expect(call.url).toContain('/v1.1/jsonrpc/incidents');
    expect(call.data.params.endpointIds).toEqual([ENDPOINT_ID]);
  });

  it('restoreEndpointFromIsolation sends createRestoreEndpointFromIsolationTask', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    stubJsonRpc(client, [TASK_ID]);

    const handler = BitdefenderGravityzone.actions.restoreEndpointFromIsolation.handler;
    const result = await handler(ctx as any, { endpointIds: [ENDPOINT_ID] });

    expect(result).toEqual([TASK_ID]);
    const call = client.request.mock.calls[0][0];
    expect(call.data.method).toBe('createRestoreEndpointFromIsolationTask');
  });

  it('scanEndpoint sends createScanTask', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    stubJsonRpc(client, TASK_ID);

    const handler = BitdefenderGravityzone.actions.scanEndpoint.handler;
    const result = await handler(ctx as any, { targetIds: [ENDPOINT_ID], type: 1 });

    expect(result).toBe(TASK_ID);
    const call = client.request.mock.calls[0][0];
    expect(call.data.method).toBe('createScanTask');
    expect(call.data.params.targetIds).toEqual([ENDPOINT_ID]);
    expect(call.data.params.type).toBe(1);
  });

  it('getTask sends getTaskStatus to v1.1 network path', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    stubJsonRpc(client, { status: 3 });

    const handler = BitdefenderGravityzone.actions.getTask.handler;
    const result = await handler(ctx as any, { taskId: TASK_ID, returnSubtasks: true });

    expect(result).toEqual({ status: 3 });
    const call = client.request.mock.calls[0][0];
    expect(call.data.method).toBe('getTaskStatus');
    expect(call.url).toContain('/v1.1/jsonrpc/network');
    expect(call.data.params.returnSubtasks).toBe(true);
  });

  it('listQuarantineItems sends getQuarantineItemsList', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    stubJsonRpc(client, { items: [], page: 1, pagesCount: 0, perPage: 30, total: 0 });
    const result = await BitdefenderGravityzone.actions.listQuarantineItems.handler(ctx as any, {
      page: 1,
      endpointId: ENDPOINT_ID,
    });
    expect(result).toHaveProperty('items');
    expect(client.request.mock.calls[0][0].data.method).toBe('getQuarantineItemsList');
    expect(client.request.mock.calls[0][0].url).toContain('/v1.0/jsonrpc/quarantine/computers');
  });

  it.each([
    ['restoreQuarantineItem', { quarantineItemsIds: [QUARANTINE_ID] }],
    ['deleteQuarantineItem', { quarantineItemsIds: [QUARANTINE_ID] }],
  ] as Array<[string, Record<string, unknown>]>)(
    '%s succeeds when result is true',
    async (action, input) => {
      const client = makeClient();
      const ctx = makeCtx(client);
      stubJsonRpc(client, true);
      const result = await BitdefenderGravityzone.actions[action].handler(ctx as any, input);
      expect(result).toEqual({ requested: true, result: true });
    }
  );

  it.each([
    ['restoreQuarantineItem', { quarantineItemsIds: [QUARANTINE_ID] }],
    ['deleteQuarantineItem', { quarantineItemsIds: [QUARANTINE_ID] }],
  ] as Array<[string, Record<string, unknown>]>)(
    '%s throws when result is false',
    async (action, input) => {
      const client = makeClient();
      const ctx = makeCtx(client);
      stubJsonRpc(client, false);
      await expect(
        BitdefenderGravityzone.actions[action].handler(ctx as any, input)
      ).rejects.toThrow('Task creation was unsuccessful');
    }
  );

  it('quarantineFile sends createAddFileToQuarantineTask to v1.1', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    stubJsonRpc(client, [TASK_ID]);
    const result = await BitdefenderGravityzone.actions.quarantineFile.handler(ctx as any, {
      endpointIds: [ENDPOINT_ID],
      filePath: '/tmp/suspicious.exe',
    });
    expect(result).toEqual([TASK_ID]);
    expect(client.request.mock.calls[0][0].data.method).toBe('createAddFileToQuarantineTask');
    expect(client.request.mock.calls[0][0].url).toContain('/v1.1/jsonrpc/quarantine/computers');
  });

  it('addToBlocklist sends addToBlocklist to v1.0 incidents', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    stubJsonRpc(client, true);
    const result = await BitdefenderGravityzone.actions.addToBlocklist.handler(ctx as any, {
      hashType: 1,
      hashList: ['abc123def456789012345678901234567890123456789012345678901234'],
      sourceInfo: 'Elastic SOAR',
    });
    expect(result).toBe(true);
    expect(client.request.mock.calls[0][0].data.method).toBe('addToBlocklist');
    expect(client.request.mock.calls[0][0].url).toContain('/v1.0/jsonrpc/incidents');
  });

  it.each([
    ['getBlocklistItems', { page: 1, perPage: 10 }, 'getBlocklistItems', 'items'],
    ['listGroups', {}, 'getCustomGroupsList', undefined],
    ['listPolicies', {}, 'getPoliciesList', 'items'],
    ['removeFromBlocklist', { hashItemId: 'item-1' }, 'removeFromBlocklist', undefined],
  ] as Array<[string, Record<string, unknown>, string, string | undefined]>)(
    '%s sends %s',
    async (action, input, method, expectProp) => {
      const client = makeClient();
      const ctx = makeCtx(client);
      const mockData =
        expectProp === 'items'
          ? { items: [], page: 1, pagesCount: 0, perPage: 30, total: 0 }
          : true;
      stubJsonRpc(client, action === 'listGroups' ? [{ id: 'g1', name: 'P' }] : mockData);
      const result = await BitdefenderGravityzone.actions[action].handler(ctx as any, input);
      if (expectProp) expect(result).toHaveProperty(expectProp);
      else expect(result).toBeDefined();
      expect(client.request.mock.calls[0][0].data.method).toBe(method);
    }
  );
});

// Error handling

describe('Bitdefender GravityZone error handling', () => {
  it('throws auth error on JSON-RPC code -32001', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    stubJsonRpcError(client, -32001, 'Unauthorized');

    const handler = BitdefenderGravityzone.actions.searchEndpoints.handler;
    await expect(handler(ctx as any, {})).rejects.toThrow('Authorization error');
  });

  it('throws not found on JSON-RPC code -32002', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    stubJsonRpcError(client, -32002, 'Endpoint not found');

    const handler = BitdefenderGravityzone.actions.getEndpoint.handler;
    await expect(handler(ctx as any, { endpointId: ENDPOINT_ID })).rejects.toThrow('Not found');
  });

  it('throws invalid params on JSON-RPC code -32602', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    stubJsonRpcError(client, -32602, 'Invalid endpointId');

    const handler = BitdefenderGravityzone.actions.getEndpoint.handler;
    await expect(handler(ctx as any, { endpointId: ENDPOINT_ID })).rejects.toThrow(
      'Invalid parameters'
    );
  });

  it('throws on HTTP 401', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    client.request.mockResolvedValue({
      status: 401,
      headers: { 'content-type': 'application/json' },
      data: {},
    });

    const handler = BitdefenderGravityzone.actions.searchEndpoints.handler;
    await expect(handler(ctx as any, {})).rejects.toThrow('Invalid or expired API key');
  });

  it('throws on HTTP 403', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    client.request.mockResolvedValue({
      status: 403,
      headers: { 'content-type': 'application/json' },
      data: {},
    });

    const handler = BitdefenderGravityzone.actions.searchEndpoints.handler;
    await expect(handler(ctx as any, {})).rejects.toThrow('Insufficient permissions');
  });

  it('detects HTML error pages', async () => {
    const client = makeClient();
    const ctx = makeCtx(client);
    client.request.mockResolvedValue({
      status: 502,
      headers: { 'content-type': 'text/html' },
      data: '<html><body>Bad Gateway</body></html>',
    });

    const handler = BitdefenderGravityzone.actions.searchEndpoints.handler;
    await expect(handler(ctx as any, {})).rejects.toThrow('HTML error page');
  });
});

// Action definitions

describe('Bitdefender GravityZone action definitions', () => {
  const actions = BitdefenderGravityzone.actions;

  it('has 15 actions defined', () => {
    expect(Object.keys(actions)).toHaveLength(15);
  });

  it.each([
    ['searchEndpoints', 'read', true],
    ['getEndpoint', 'read', true],
    ['getTask', 'read', true],
    ['isolateEndpoint', 'destroy', false],
    ['restoreEndpointFromIsolation', 'destroy', false],
    ['scanEndpoint', 'write', true],
    ['quarantineFile', 'destroy', false],
    ['listQuarantineItems', 'read', true],
    ['restoreQuarantineItem', 'write', false],
    ['deleteQuarantineItem', 'destroy', false],
    ['addToBlocklist', 'write', true],
    ['getBlocklistItems', 'read', true],
    ['removeFromBlocklist', 'destroy', false],
    ['listGroups', 'read', true],
    ['listPolicies', 'read', true],
  ] as Array<[string, string, boolean]>)('%s has scope %s and isTool %s', (name, scope, isTool) => {
    const action = actions[name];
    expect(action).toBeDefined();
    expect(action.scope).toBe(scope);
    expect(action.isTool).toBe(isTool);
  });
});
