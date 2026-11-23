/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getConnectorSpec } from '../../..';
import { SophosCentral } from './sophos_central';
import {
  ListAlertsInputSchema,
  GetAlertInputSchema,
  ActOnAlertInputSchema,
  ActOnAlertsBulkInputSchema,
  ListEndpointsInputSchema,
  GetEndpointInputSchema,
  IsolateEndpointInputSchema,
  DeisolateEndpointInputSchema,
  ScanEndpointInputSchema,
  GetTamperProtectionInputSchema,
  UpdateTamperProtectionInputSchema,
  ListBlockedItemsInputSchema,
  AddBlockedItemInputSchema,
  AddAllowedItemInputSchema,
  DeleteBlockedItemInputSchema,
  ListDetectionsInputSchema,
} from './types';
import type { AuthTypeDef } from '../../connector_spec';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TENANT_ID = '3f4e5a6b-7c8d-9e0f-a1b2-c3d4e5f60718';
const DATA_REGION = 'https://api-us01.central.sophos.com';
const ENDPOINT_ID = 'aaaabbbb-cccc-dddd-eeee-ffffaaaabbbb';
const ALERT_ID = '11112222-3333-4444-5555-666677778888';
const GLOBAL_API_URL = 'https://api.central.sophos.com';

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

/** Builds a fresh mock client. Each test gets its own to avoid cross-test pollution. */
const makeClient = () => ({
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  request: jest.fn(),
});

type MockClient = ReturnType<typeof makeClient>;

/** Primes `client.get` to answer the whoami probe that every `request()` call makes. */
const stubWhoami = (client: MockClient) => {
  client.get.mockResolvedValue({
    data: {
      id: TENANT_ID,
      idType: 'tenant',
      apiHosts: { dataRegion: DATA_REGION },
    },
  });
};

const makeCtx = (client: MockClient, configOverride?: Record<string, unknown>) => ({
  client,
  config: configOverride ?? { apiUrl: GLOBAL_API_URL },
  secrets: {},
  log: { debug: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() },
});

const isAuthTypeDef = (t: string | AuthTypeDef): t is AuthTypeDef => typeof t === 'object';

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Metadata and registration
// ---------------------------------------------------------------------------

describe('SophosCentral metadata', () => {
  it('is discoverable via getConnectorSpec', () => {
    expect(getConnectorSpec('.sophos_central')).toBe(SophosCentral);
  });

  it('has the correct id and display name', () => {
    expect(SophosCentral.metadata.id).toBe('.sophos_central');
    expect(SophosCentral.metadata.displayName).toBe('Sophos Central');
  });

  it('requires enterprise licence', () => {
    expect(SophosCentral.metadata.minimumLicense).toBe('enterprise');
  });

  it('supports agentBuilder', () => {
    expect(SophosCentral.metadata.supportedFeatureIds).toContain('agentBuilder');
  });

  it('enables the test handler', () => {
    expect(SophosCentral.test.enabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

describe('SophosCentral auth', () => {
  it('uses oauth_client_credentials', () => {
    const types = (SophosCentral.auth?.types ?? []).filter(isAuthTypeDef);
    expect(types.some((t) => t.type === 'oauth_client_credentials')).toBe(true);
  });

  it('defaults tokenUrl to the Sophos identity service', () => {
    const oauthType = (SophosCentral.auth?.types ?? [])
      .filter(isAuthTypeDef)
      .find((t) => t.type === 'oauth_client_credentials');
    expect(oauthType?.defaults?.tokenUrl).toBe('https://id.sophos.com/api/v2/oauth2/token');
  });

  it('hides tokenUrl and scope in the UI', () => {
    const oauthType = (SophosCentral.auth?.types ?? [])
      .filter(isAuthTypeDef)
      .find((t) => t.type === 'oauth_client_credentials');
    expect(oauthType?.overrides?.meta?.tokenUrl?.hidden).toBe(true);
    expect(oauthType?.overrides?.meta?.scope?.hidden).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// All isTool actions have a valid scope
// ---------------------------------------------------------------------------

describe('action scopes', () => {
  it('every isTool action has a read, write, or destroy scope', () => {
    for (const [name, action] of Object.entries(SophosCentral.actions)) {
      if (action.isTool) {
        expect({ name, scope: action.scope }).toHaveProperty('scope');
        expect(['read', 'write', 'destroy']).toContain(action.scope);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Input schema validation
// ---------------------------------------------------------------------------

describe('input schemas', () => {
  describe('ListAlertsInputSchema', () => {
    it('accepts an empty object', () => {
      expect(ListAlertsInputSchema.safeParse({}).success).toBe(true);
    });

    it('accepts severity array up to 10 items', () => {
      expect(ListAlertsInputSchema.safeParse({ severity: ['high', 'medium'] }).success).toBe(true);
    });

    it('rejects severity array over 10 items', () => {
      expect(
        ListAlertsInputSchema.safeParse({ severity: new Array(11).fill('high') }).success
      ).toBe(false);
    });

    it('rejects pageSize above 100', () => {
      expect(ListAlertsInputSchema.safeParse({ pageSize: 101 }).success).toBe(false);
    });
  });

  describe('GetAlertInputSchema', () => {
    it('requires a valid UUID alertId', () => {
      expect(GetAlertInputSchema.safeParse({ alertId: ALERT_ID }).success).toBe(true);
      expect(GetAlertInputSchema.safeParse({ alertId: 'not-a-uuid' }).success).toBe(false);
      expect(GetAlertInputSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('ActOnAlertInputSchema', () => {
    it('accepts a valid alertId and action', () => {
      expect(
        ActOnAlertInputSchema.safeParse({ alertId: ALERT_ID, action: 'acknowledge' }).success
      ).toBe(true);
    });

    it('rejects an unknown action', () => {
      expect(
        ActOnAlertInputSchema.safeParse({ alertId: ALERT_ID, action: 'deleteAlert' }).success
      ).toBe(false);
    });

    it('rejects message over 1000 chars', () => {
      expect(
        ActOnAlertInputSchema.safeParse({
          alertId: ALERT_ID,
          action: 'acknowledge',
          message: 'x'.repeat(1001),
        }).success
      ).toBe(false);
    });
  });

  describe('ActOnAlertsBulkInputSchema', () => {
    it('requires at least one ID', () => {
      expect(ActOnAlertsBulkInputSchema.safeParse({ ids: [], action: 'acknowledge' }).success).toBe(
        false
      );
    });

    it('rejects more than 100 IDs', () => {
      expect(
        ActOnAlertsBulkInputSchema.safeParse({
          ids: new Array(101).fill(ALERT_ID),
          action: 'acknowledge',
        }).success
      ).toBe(false);
    });

    it('accepts 1-100 valid UUIDs', () => {
      expect(
        ActOnAlertsBulkInputSchema.safeParse({ ids: [ALERT_ID], action: 'clearThreat' }).success
      ).toBe(true);
    });
  });

  describe('ListEndpointsInputSchema', () => {
    it('accepts an empty object', () => {
      expect(ListEndpointsInputSchema.safeParse({}).success).toBe(true);
    });

    it('accepts valid isolationStatus values', () => {
      expect(ListEndpointsInputSchema.safeParse({ isolationStatus: 'isolated' }).success).toBe(
        true
      );
      expect(ListEndpointsInputSchema.safeParse({ isolationStatus: 'notIsolated' }).success).toBe(
        true
      );
    });

    it('rejects an unknown isolationStatus', () => {
      expect(ListEndpointsInputSchema.safeParse({ isolationStatus: 'unknown' }).success).toBe(
        false
      );
    });

    it('rejects pageSize above 100', () => {
      expect(ListEndpointsInputSchema.safeParse({ pageSize: 101 }).success).toBe(false);
    });
  });

  describe('GetEndpointInputSchema', () => {
    it('requires a valid UUID endpointId', () => {
      expect(GetEndpointInputSchema.safeParse({ endpointId: ENDPOINT_ID }).success).toBe(true);
      expect(GetEndpointInputSchema.safeParse({ endpointId: 'bad' }).success).toBe(false);
    });
  });

  describe('IsolateEndpointInputSchema', () => {
    it('requires at least one UUID', () => {
      expect(IsolateEndpointInputSchema.safeParse({ ids: [] }).success).toBe(false);
      expect(IsolateEndpointInputSchema.safeParse({ ids: [ENDPOINT_ID] }).success).toBe(true);
    });

    it('rejects more than 500 IDs', () => {
      expect(
        IsolateEndpointInputSchema.safeParse({ ids: new Array(501).fill(ENDPOINT_ID) }).success
      ).toBe(false);
    });

    it('rejects comment over 400 chars', () => {
      expect(
        IsolateEndpointInputSchema.safeParse({
          ids: [ENDPOINT_ID],
          comment: 'x'.repeat(401),
        }).success
      ).toBe(false);
    });
  });

  describe('DeisolateEndpointInputSchema', () => {
    it('requires at least one UUID', () => {
      expect(DeisolateEndpointInputSchema.safeParse({ ids: [ENDPOINT_ID] }).success).toBe(true);
      expect(DeisolateEndpointInputSchema.safeParse({ ids: [] }).success).toBe(false);
    });
  });

  describe('ScanEndpointInputSchema', () => {
    it('requires at least one UUID', () => {
      expect(ScanEndpointInputSchema.safeParse({ ids: [ENDPOINT_ID] }).success).toBe(true);
      expect(ScanEndpointInputSchema.safeParse({ ids: [] }).success).toBe(false);
    });
  });

  describe('GetTamperProtectionInputSchema', () => {
    it('requires a valid UUID endpointId', () => {
      expect(GetTamperProtectionInputSchema.safeParse({ endpointId: ENDPOINT_ID }).success).toBe(
        true
      );
    });
  });

  describe('UpdateTamperProtectionInputSchema', () => {
    it('requires endpointId and enabled', () => {
      expect(
        UpdateTamperProtectionInputSchema.safeParse({
          endpointId: ENDPOINT_ID,
          enabled: false,
        }).success
      ).toBe(true);
    });

    it('rejects missing enabled field', () => {
      expect(UpdateTamperProtectionInputSchema.safeParse({ endpointId: ENDPOINT_ID }).success).toBe(
        false
      );
    });
  });

  describe('ListBlockedItemsInputSchema', () => {
    it('accepts an empty object', () => {
      expect(ListBlockedItemsInputSchema.safeParse({}).success).toBe(true);
    });

    it('rejects pageSize above 100', () => {
      expect(ListBlockedItemsInputSchema.safeParse({ pageSize: 101 }).success).toBe(false);
    });
  });

  describe('AddBlockedItemInputSchema', () => {
    it('accepts a valid 64-char SHA-256 hex string', () => {
      expect(
        AddBlockedItemInputSchema.safeParse({ sha256: 'a'.repeat(64), comment: 'test' }).success
      ).toBe(true);
    });

    it('rejects a non-64-char string', () => {
      expect(AddBlockedItemInputSchema.safeParse({ sha256: 'abc' }).success).toBe(false);
    });

    it('rejects non-hex characters', () => {
      expect(AddBlockedItemInputSchema.safeParse({ sha256: 'z'.repeat(64) }).success).toBe(false);
    });
  });

  describe('AddAllowedItemInputSchema', () => {
    it('accepts valid type and properties', () => {
      expect(
        AddAllowedItemInputSchema.safeParse({
          type: 'sha256',
          properties: { sha256: 'a'.repeat(64) },
          comment: 'test comment',
        }).success
      ).toBe(true);
    });

    it('rejects an unknown type', () => {
      expect(
        AddAllowedItemInputSchema.safeParse({
          type: 'md5',
          properties: { md5: 'abc' },
        }).success
      ).toBe(false);
    });
  });

  describe('DeleteBlockedItemInputSchema', () => {
    it('requires a non-empty blockedItemId', () => {
      expect(DeleteBlockedItemInputSchema.safeParse({ blockedItemId: 'item-123' }).success).toBe(
        true
      );
      expect(DeleteBlockedItemInputSchema.safeParse({ blockedItemId: '' }).success).toBe(false);
    });

    it('rejects blockedItemId over 256 chars', () => {
      expect(
        DeleteBlockedItemInputSchema.safeParse({ blockedItemId: 'x'.repeat(257) }).success
      ).toBe(false);
    });
  });

  describe('ListDetectionsInputSchema', () => {
    it('accepts an empty object', () => {
      expect(ListDetectionsInputSchema.safeParse({}).success).toBe(true);
    });

    it('rejects pageSize above 1000', () => {
      expect(ListDetectionsInputSchema.safeParse({ pageSize: 1001 }).success).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Test handler (whoami connectivity check)
// ---------------------------------------------------------------------------

describe('test handler', () => {
  it('calls GET whoami/v1 and returns ok + tenantId + dataRegion on success', async () => {
    const client = makeClient();
    stubWhoami(client);
    const ctx = makeCtx(client);

    const result = await SophosCentral.test.handler(ctx as never);

    expect(client.get).toHaveBeenCalledWith(
      `${GLOBAL_API_URL}/whoami/v1`,
      expect.objectContaining({ timeout: 10_000 })
    );
    expect(result).toEqual({ tenantId: TENANT_ID, dataRegion: DATA_REGION });
  });

  it('wraps whoami errors in a readable message', async () => {
    const client = makeClient();
    client.get.mockRejectedValue(
      Object.assign(new Error('Unauthorized'), {
        response: { status: 401, data: { message: 'Invalid credentials' } },
      })
    );
    const ctx = makeCtx(client);

    await expect(SophosCentral.test.handler(ctx as never)).rejects.toThrow();
  });

  it('throws when whoami response is missing tenantId', async () => {
    const client = makeClient();
    client.get.mockResolvedValue({ data: { id: '', apiHosts: { dataRegion: DATA_REGION } } });
    const ctx = makeCtx(client);

    // whoami throws a plain Error (no axios response body); throwApiError falls back
    await expect(SophosCentral.test.handler(ctx as never)).rejects.toThrow(
      'Sophos Central connection test failed'
    );
  });

  it('uses apiUrl config override for the whoami endpoint', async () => {
    const client = makeClient();
    stubWhoami(client);
    const ctx = makeCtx(client, { apiUrl: 'https://api.eu.central.sophos.com' });

    await SophosCentral.test.handler(ctx as never);

    expect(client.get).toHaveBeenCalledWith(
      'https://api.eu.central.sophos.com/whoami/v1',
      expect.anything()
    );
  });
});

// ---------------------------------------------------------------------------
// Handler: listAlerts
// ---------------------------------------------------------------------------

describe('listAlerts', () => {
  it('calls GET /common/v1/alerts with X-Tenant-ID header', async () => {
    const client = makeClient();
    stubWhoami(client);
    client.request.mockResolvedValue({
      data: { items: [{ id: ALERT_ID }], pages: { nextKey: 'token' } },
    });
    const ctx = makeCtx(client);

    const result = await SophosCentral.actions.listAlerts.handler(ctx as never, {});

    expect(client.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: `${DATA_REGION}/common/v1/alerts`,
        headers: { 'X-Tenant-ID': TENANT_ID },
      })
    );
    expect(result).toEqual({ items: [{ id: ALERT_ID }], pages: { nextKey: 'token' } });
  });

  it('passes severity, product, and pagination params', async () => {
    const client = makeClient();
    stubWhoami(client);
    client.request.mockResolvedValue({ data: {} });
    const ctx = makeCtx(client);

    await SophosCentral.actions.listAlerts.handler(ctx as never, {
      severity: ['high'],
      pageSize: 50,
      pageFromKey: 'cursor-abc',
    });

    const config = client.request.mock.calls[0][0];
    expect(config.params).toMatchObject({
      severity: ['high'],
      pageSize: 50,
      pageFromKey: 'cursor-abc',
    });
  });
});

// ---------------------------------------------------------------------------
// Handler: getAlert
// ---------------------------------------------------------------------------

describe('getAlert', () => {
  it('calls GET /common/v1/alerts/:alertId', async () => {
    const client = makeClient();
    stubWhoami(client);
    client.request.mockResolvedValue({ data: { id: ALERT_ID, severity: 'high' } });
    const ctx = makeCtx(client);

    const result = await SophosCentral.actions.getAlert.handler(ctx as never, {
      alertId: ALERT_ID,
    });

    expect(client.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: `${DATA_REGION}/common/v1/alerts/${ALERT_ID}`,
      })
    );
    expect(result).toEqual({ id: ALERT_ID, severity: 'high' });
  });
});

// ---------------------------------------------------------------------------
// Handler: actOnAlert
// ---------------------------------------------------------------------------

describe('actOnAlert', () => {
  it('POSTs to /common/v1/alerts/:alertId/actions', async () => {
    const client = makeClient();
    stubWhoami(client);
    client.request.mockResolvedValue({ data: { action: 'acknowledge', result: 'success' } });
    const ctx = makeCtx(client);

    await SophosCentral.actions.actOnAlert.handler(ctx as never, {
      alertId: ALERT_ID,
      action: 'acknowledge',
    });

    expect(client.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: `${DATA_REGION}/common/v1/alerts/${ALERT_ID}/actions`,
        data: { action: 'acknowledge' },
      })
    );
  });

  it('includes message in body when provided', async () => {
    const client = makeClient();
    stubWhoami(client);
    client.request.mockResolvedValue({ data: {} });
    const ctx = makeCtx(client);

    await SophosCentral.actions.actOnAlert.handler(ctx as never, {
      alertId: ALERT_ID,
      action: 'acknowledge',
      message: 'Closing as benign',
    });

    const config = client.request.mock.calls[0][0];
    expect(config.data.message).toBe('Closing as benign');
  });
});

// ---------------------------------------------------------------------------
// Handler: actOnAlertsBulk — partial failure
// ---------------------------------------------------------------------------

describe('actOnAlertsBulk', () => {
  const ALERT_ID_2 = '22223333-4444-5555-6666-777788889999';

  it('iterates over all IDs and returns successCount + failureCount', async () => {
    const client = makeClient();
    // whoami is resolved once before the loop
    stubWhoami(client);
    client.request
      .mockResolvedValueOnce({ data: { result: 'success' } }) // ALERT_ID succeeds
      .mockRejectedValueOnce(
        Object.assign(new Error('Not Found'), { response: { status: 404, data: {} } })
      ); // ALERT_ID_2 fails
    const ctx = makeCtx(client);

    const result = await SophosCentral.actions.actOnAlertsBulk.handler(ctx as never, {
      ids: [ALERT_ID, ALERT_ID_2],
      action: 'acknowledge',
    });

    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(1);
    expect(result.results).toHaveLength(2);
    expect(result.results[0]).toMatchObject({ alertId: ALERT_ID, status: 'success' });
    expect(result.results[1]).toMatchObject({ alertId: ALERT_ID_2, status: 'failed' });
  });

  it('returns all successes when no failures occur', async () => {
    const client = makeClient();
    stubWhoami(client);
    client.request.mockResolvedValue({ data: {} });
    const ctx = makeCtx(client);

    const result = await SophosCentral.actions.actOnAlertsBulk.handler(ctx as never, {
      ids: [ALERT_ID, ALERT_ID_2],
      action: 'clearThreat',
    });

    expect(result.successCount).toBe(2);
    expect(result.failureCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Handler: listEndpoints
// ---------------------------------------------------------------------------

describe('listEndpoints', () => {
  it('calls GET /endpoint/v1/endpoints with tenant header', async () => {
    const client = makeClient();
    stubWhoami(client);
    client.request.mockResolvedValue({
      data: { items: [{ id: ENDPOINT_ID }], pages: { nextKey: null } },
    });
    const ctx = makeCtx(client);

    const result = await SophosCentral.actions.listEndpoints.handler(ctx as never, {
      isolationStatus: 'notIsolated',
    });

    expect(client.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: `${DATA_REGION}/endpoint/v1/endpoints`,
        headers: { 'X-Tenant-ID': TENANT_ID },
      })
    );
    expect(result).toEqual({ items: [{ id: ENDPOINT_ID }], pages: { nextKey: null } });
  });
});

// ---------------------------------------------------------------------------
// Handler: getEndpoint
// ---------------------------------------------------------------------------

describe('getEndpoint', () => {
  it('calls GET /endpoint/v1/endpoints/:endpointId', async () => {
    const endpointData = { id: ENDPOINT_ID, hostname: 'web-01', health: { overall: 'good' } };
    const client = makeClient();
    stubWhoami(client);
    client.request.mockResolvedValue({ data: endpointData });
    const ctx = makeCtx(client);

    const result = await SophosCentral.actions.getEndpoint.handler(ctx as never, {
      endpointId: ENDPOINT_ID,
    });

    expect(client.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${DATA_REGION}/endpoint/v1/endpoints/${ENDPOINT_ID}`,
      })
    );
    expect(result).toEqual(endpointData);
  });
});

// ---------------------------------------------------------------------------
// Handler: isolateEndpoint
// ---------------------------------------------------------------------------

describe('isolateEndpoint', () => {
  it('POSTs to /endpoint/v1/endpoints/isolation with enabled:true', async () => {
    const client = makeClient();
    stubWhoami(client);
    client.request.mockResolvedValue({ data: { items: [{ id: ENDPOINT_ID }] } });
    const ctx = makeCtx(client);

    await SophosCentral.actions.isolateEndpoint.handler(ctx as never, {
      ids: [ENDPOINT_ID],
      comment: 'Incident INC-999',
    });

    expect(client.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: `${DATA_REGION}/endpoint/v1/endpoints/isolation`,
        data: { enabled: true, ids: [ENDPOINT_ID], comment: 'Incident INC-999' },
      })
    );
  });

  it('omits comment when not provided', async () => {
    const client = makeClient();
    stubWhoami(client);
    client.request.mockResolvedValue({ data: {} });
    const ctx = makeCtx(client);

    await SophosCentral.actions.isolateEndpoint.handler(ctx as never, { ids: [ENDPOINT_ID] });

    const config = client.request.mock.calls[0][0];
    expect(config.data).toEqual({ enabled: true, ids: [ENDPOINT_ID] });
    expect(config.data.comment).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Handler: deisolateEndpoint
// ---------------------------------------------------------------------------

describe('deisolateEndpoint', () => {
  it('POSTs to /endpoint/v1/endpoints/isolation with enabled:false', async () => {
    const client = makeClient();
    stubWhoami(client);
    client.request.mockResolvedValue({ data: {} });
    const ctx = makeCtx(client);

    await SophosCentral.actions.deisolateEndpoint.handler(ctx as never, { ids: [ENDPOINT_ID] });

    expect(client.request).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ enabled: false, ids: [ENDPOINT_ID] }),
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Handler: scanEndpoint
// ---------------------------------------------------------------------------

describe('scanEndpoint', () => {
  it('POSTs to /endpoint/v1/endpoints/scans with ids', async () => {
    const client = makeClient();
    stubWhoami(client);
    client.request.mockResolvedValue({ data: { requestId: 'scan-abc' } });
    const ctx = makeCtx(client);

    const result = await SophosCentral.actions.scanEndpoint.handler(ctx as never, {
      ids: [ENDPOINT_ID],
    });

    expect(client.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: `${DATA_REGION}/endpoint/v1/endpoints/scans`,
        data: { ids: [ENDPOINT_ID] },
      })
    );
    expect(result).toEqual({ requestId: 'scan-abc' });
  });
});

// ---------------------------------------------------------------------------
// Handler: getTamperProtection
// ---------------------------------------------------------------------------

describe('getTamperProtection', () => {
  it('calls GET /endpoint/v1/endpoints/:endpointId/tamper-protection', async () => {
    const tamperData = { enabled: true, password: 'secret123' };
    const client = makeClient();
    stubWhoami(client);
    client.request.mockResolvedValue({ data: tamperData });
    const ctx = makeCtx(client);

    const result = await SophosCentral.actions.getTamperProtection.handler(ctx as never, {
      endpointId: ENDPOINT_ID,
    });

    expect(client.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${DATA_REGION}/endpoint/v1/endpoints/${ENDPOINT_ID}/tamper-protection`,
      })
    );
    // Recovery password must be stripped — it is an endpoint credential
    expect(result).toEqual({ enabled: true });
    expect(result).not.toHaveProperty('password');
  });
});

// ---------------------------------------------------------------------------
// Handler: updateTamperProtection
// ---------------------------------------------------------------------------

describe('updateTamperProtection', () => {
  it('POSTs with enabled and optional regeneratePassword', async () => {
    const client = makeClient();
    stubWhoami(client);
    client.request.mockResolvedValue({ data: { enabled: false } });
    const ctx = makeCtx(client);

    await SophosCentral.actions.updateTamperProtection.handler(ctx as never, {
      endpointId: ENDPOINT_ID,
      enabled: false,
      regeneratePassword: true,
    });

    expect(client.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: `${DATA_REGION}/endpoint/v1/endpoints/${ENDPOINT_ID}/tamper-protection`,
        data: { enabled: false, regeneratePassword: true },
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Handler: listBlockedItems
// ---------------------------------------------------------------------------

describe('listBlockedItems', () => {
  it('calls GET /endpoint/v1/settings/blocked-items', async () => {
    const client = makeClient();
    stubWhoami(client);
    client.request.mockResolvedValue({ data: { items: [], pages: { total: 1 } } });
    const ctx = makeCtx(client);

    await SophosCentral.actions.listBlockedItems.handler(ctx as never, { pageSize: 20 });

    expect(client.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: `${DATA_REGION}/endpoint/v1/settings/blocked-items`,
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Handler: addBlockedItem
// ---------------------------------------------------------------------------

describe('addBlockedItem', () => {
  const SHA256 = 'a'.repeat(64);

  it('accepts input without optional comment', () => {
    const result = AddBlockedItemInputSchema.safeParse({ sha256: SHA256 });
    expect(result.success).toBe(true);
  });

  it('accepts input with optional comment', () => {
    const result = AddBlockedItemInputSchema.safeParse({ sha256: SHA256, comment: 'block it' });
    expect(result.success).toBe(true);
  });

  it('POSTs sha256 to /endpoint/v1/settings/blocked-items', async () => {
    const client = makeClient();
    stubWhoami(client);
    client.request.mockResolvedValue({ data: { id: 'item-1', type: 'sha256' } });
    const ctx = makeCtx(client);

    const result = await SophosCentral.actions.addBlockedItem.handler(ctx as never, {
      sha256: SHA256,
    });

    expect(client.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        data: expect.objectContaining({ type: 'sha256', properties: { sha256: SHA256 } }),
      })
    );
    expect(result).toEqual({ id: 'item-1', type: 'sha256' });
  });

  it('returns soft success when hash is already blocked (409)', async () => {
    const client = makeClient();
    stubWhoami(client);
    client.request.mockRejectedValue(
      Object.assign(new Error('Conflict'), { response: { status: 409, data: {} } })
    );
    const ctx = makeCtx(client);

    const result = await SophosCentral.actions.addBlockedItem.handler(ctx as never, {
      sha256: SHA256,
    });

    expect(result).toEqual({ alreadyBlocked: true, sha256: SHA256 });
  });
});

// ---------------------------------------------------------------------------
// Handler: addAllowedItem
// ---------------------------------------------------------------------------

describe('addAllowedItem', () => {
  it('accepts input without optional comment', () => {
    const result = AddAllowedItemInputSchema.safeParse({
      type: 'path',
      properties: { path: '/usr/bin/example' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts input with optional comment', () => {
    const result = AddAllowedItemInputSchema.safeParse({
      type: 'path',
      properties: { path: '/usr/bin/example' },
      comment: 'allow it',
    });
    expect(result.success).toBe(true);
  });

  it('POSTs to /endpoint/v1/settings/allowed-items', async () => {
    const client = makeClient();
    stubWhoami(client);
    client.request.mockResolvedValue({ data: { id: 'allowed-1' } });
    const ctx = makeCtx(client);

    await SophosCentral.actions.addAllowedItem.handler(ctx as never, {
      type: 'path',
      properties: { path: '/usr/bin/example' },
    });

    expect(client.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: `${DATA_REGION}/endpoint/v1/settings/allowed-items`,
        data: { type: 'path', properties: { path: '/usr/bin/example' } },
      })
    );
  });

  it('returns soft success when item is already allowed (409)', async () => {
    const client = makeClient();
    stubWhoami(client);
    client.request.mockRejectedValue(
      Object.assign(new Error('Conflict'), { response: { status: 409, data: {} } })
    );
    const ctx = makeCtx(client);

    const result = await SophosCentral.actions.addAllowedItem.handler(ctx as never, {
      type: 'sha256',
      properties: { sha256: 'a'.repeat(64) },
    });

    expect(result).toEqual({ alreadyAllowed: true, type: 'sha256' });
  });
});

// ---------------------------------------------------------------------------
// Handler: deleteBlockedItem
// ---------------------------------------------------------------------------

describe('deleteBlockedItem', () => {
  it('calls DELETE /endpoint/v1/settings/blocked-items/:id', async () => {
    const client = makeClient();
    stubWhoami(client);
    client.request.mockResolvedValue({ data: {} });
    const ctx = makeCtx(client);

    await SophosCentral.actions.deleteBlockedItem.handler(ctx as never, {
      blockedItemId: 'item-123',
    });

    expect(client.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'DELETE',
        url: `${DATA_REGION}/endpoint/v1/settings/blocked-items/item-123`,
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Handler: listDetections (async 2-step)
// ---------------------------------------------------------------------------

describe('listDetections', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('submits query, polls for completion, then fetches results', async () => {
    const RUN_ID = 'run-abc-123';
    const client = makeClient();

    client.get.mockResolvedValue({
      data: { id: TENANT_ID, apiHosts: { dataRegion: DATA_REGION } },
    });

    // submit → poll (running) → poll (succeeded) → results
    client.request
      .mockResolvedValueOnce({ data: { runId: RUN_ID } })
      .mockResolvedValueOnce({ data: { status: 'running' } })
      .mockResolvedValueOnce({ data: { result: 'succeeded' } })
      .mockResolvedValueOnce({ data: { items: [{ id: 'det-1' }] } });

    jest.useFakeTimers();
    const ctx = makeCtx(client);

    // Attach the resolution handler before running timers to prevent
    // any intermediate settled promise from going unhandled.
    const resultPromise = SophosCentral.actions.listDetections.handler(ctx as never, {
      pageSize: 10,
    });
    await jest.runAllTimersAsync();
    const result = await resultPromise;

    // submit call
    expect(client.request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        method: 'POST',
        url: `${DATA_REGION}/detections/v1/queries/detections`,
        headers: { 'X-Tenant-ID': TENANT_ID },
      })
    );
    // results call
    expect(client.request).toHaveBeenLastCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: `${DATA_REGION}/detections/v1/queries/detections/${RUN_ID}/results`,
        params: expect.objectContaining({ pageSize: 10 }),
      })
    );
    expect(result).toEqual({ items: [{ id: 'det-1' }], runId: RUN_ID });
  });

  it('throws when submit returns no runId', async () => {
    const client = makeClient();
    client.get.mockResolvedValue({
      data: { id: TENANT_ID, apiHosts: { dataRegion: DATA_REGION } },
    });
    client.request.mockResolvedValueOnce({ data: {} }); // no runId

    const ctx = makeCtx(client);
    await expect(SophosCentral.actions.listDetections.handler(ctx as never, {})).rejects.toThrow(
      'submit did not return a query id'
    );
  });

  it('throws when query run ends in a non-succeeded terminal state', async () => {
    const client = makeClient();
    client.get.mockResolvedValue({
      data: { id: TENANT_ID, apiHosts: { dataRegion: DATA_REGION } },
    });
    client.request
      .mockResolvedValueOnce({ data: { runId: 'run-xyz' } }) // submit
      .mockResolvedValueOnce({ data: { result: 'failed' } }); // poll → terminal

    jest.useFakeTimers();
    const ctx = makeCtx(client);

    // Attach rejection handler BEFORE advancing timers to avoid unhandled rejection.
    const expectation = expect(
      SophosCentral.actions.listDetections.handler(ctx as never, {})
    ).rejects.toThrow('ended with state "failed"');
    await jest.runAllTimersAsync();
    await expectation;
  });
});

// ---------------------------------------------------------------------------
// Error formatting (throwApiError)
// ---------------------------------------------------------------------------

describe('error handling', () => {
  it('formats Sophos API errors with error + message fields', async () => {
    const client = makeClient();
    stubWhoami(client);
    client.request.mockRejectedValue(
      Object.assign(new Error('Forbidden'), {
        response: {
          status: 403,
          data: { error: 'forbidden', message: 'Insufficient permissions' },
        },
      })
    );
    const ctx = makeCtx(client);

    await expect(
      SophosCentral.actions.getAlert.handler(ctx as never, { alertId: ALERT_ID })
    ).rejects.toThrow('forbidden: Insufficient permissions (HTTP 403)');
  });

  it('formats Sophos API errors with only message field', async () => {
    const client = makeClient();
    stubWhoami(client);
    client.request.mockRejectedValue(
      Object.assign(new Error('Not Found'), {
        response: { status: 404, data: { message: 'Alert not found' } },
      })
    );
    const ctx = makeCtx(client);

    await expect(
      SophosCentral.actions.getAlert.handler(ctx as never, { alertId: ALERT_ID })
    ).rejects.toThrow('Alert not found (HTTP 404)');
  });

  it('uses fallback message when response body has no detail', async () => {
    const client = makeClient();
    stubWhoami(client);
    client.request.mockRejectedValue(
      Object.assign(new Error('Server Error'), {
        response: { status: 500, data: {} },
      })
    );
    const ctx = makeCtx(client);

    // 500 is retryable; use fake timers to skip the backoff sleeps
    jest.useFakeTimers();
    const expectation = expect(
      SophosCentral.actions.getEndpoint.handler(ctx as never, { endpointId: ENDPOINT_ID })
    ).rejects.toThrow(`Failed to get endpoint ${ENDPOINT_ID} (HTTP 500)`);
    await jest.runAllTimersAsync();
    await expectation;
    jest.useRealTimers();
  });
});
