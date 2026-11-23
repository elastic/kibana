/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MicrosoftDefenderXdr } from './microsoft_defender_xdr';
import { UpdateAlertInputSchema, UpdateIncidentInputSchema } from './types';
import type { AuthTypeDef, ConnectorSpec } from '../../connector_spec';

const isAuthTypeDef = (t: string | AuthTypeDef): t is AuthTypeDef => typeof t === 'object';

// ---- Helpers ----

const makeClient = (getData: (url: string) => unknown = () => ({ value: [] })) => ({
  get: jest.fn(async (url: string) => ({ data: getData(url) })),
  post: jest.fn(async (_url: string, _body?: unknown, _opts?: unknown) => ({
    data: { schema: [], results: [] },
  })),
  patch: jest.fn(async (_url: string, _body?: unknown, _opts?: unknown) => ({
    data: { id: '1', status: 'resolved' },
  })),
  put: jest.fn(),
  delete: jest.fn(async () => ({ data: {} })),
  request: jest.fn(),
});

const makeCtx = (
  overrides: Partial<ReturnType<typeof makeClient>> = {},
  config: Record<string, unknown> = {}
) => ({
  client: { ...makeClient(), ...overrides },
  config,
  secrets: {},
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
});

// ---- Metadata ----

describe('MicrosoftDefenderXdr metadata', () => {
  it('has the correct connector ID', () => {
    expect(MicrosoftDefenderXdr.metadata.id).toBe('.microsoft_defender_xdr');
  });

  it('has the correct display name', () => {
    expect(MicrosoftDefenderXdr.metadata.displayName).toBe('Microsoft Defender XDR');
  });

  it('requires enterprise license', () => {
    expect(MicrosoftDefenderXdr.metadata.minimumLicense).toBe('enterprise');
  });

  it('supports agentBuilder feature', () => {
    expect(MicrosoftDefenderXdr.metadata.supportedFeatureIds).toContain('agentBuilder');
  });
});

// ---- Auth ----

describe('MicrosoftDefenderXdr auth', () => {
  it('uses oauth_client_credentials', () => {
    const authTypes = (MicrosoftDefenderXdr.auth?.types ?? []).filter(isAuthTypeDef);
    expect(authTypes.some((t) => t.type === 'oauth_client_credentials')).toBe(true);
  });

  it('uses oauth_client_credentials_private_key_jwt for certificate auth', () => {
    const authTypes = (MicrosoftDefenderXdr.auth?.types ?? []).filter(isAuthTypeDef);
    expect(authTypes.some((t) => t.type === 'oauth_client_credentials_private_key_jwt')).toBe(true);
  });

  it('defaults scope to graph.microsoft.com for client secret auth', () => {
    const oauthType = (MicrosoftDefenderXdr.auth?.types ?? [])
      .filter(isAuthTypeDef)
      .find((t) => t.type === 'oauth_client_credentials');
    expect(oauthType?.defaults?.scope).toBe('https://graph.microsoft.com/.default');
  });

  it('defaults scope to graph.microsoft.com for certificate auth', () => {
    const oauthType = (MicrosoftDefenderXdr.auth?.types ?? [])
      .filter(isAuthTypeDef)
      .find((t) => t.type === 'oauth_client_credentials_private_key_jwt');
    expect(oauthType?.defaults?.scope).toBe('https://graph.microsoft.com/.default');
  });

  it('exposes the scope field with help text on client secret auth', () => {
    const oauthType = (MicrosoftDefenderXdr.auth?.types ?? [])
      .filter(isAuthTypeDef)
      .find((t) => t.type === 'oauth_client_credentials');
    const scopeMeta = (oauthType?.overrides?.meta as Record<string, unknown>)?.scope as Record<
      string,
      unknown
    >;
    expect(scopeMeta).toMatchObject({
      label: expect.any(String),
      helpText: expect.stringContaining('GCC High'),
    });
  });
});

// ---- Schema (cloud config) ----

describe('MicrosoftDefenderXdr schema', () => {
  it('schema is defined', () => {
    expect(MicrosoftDefenderXdr.schema).toBeDefined();
  });

  it('schema accepts commercial cloud', () => {
    const result = MicrosoftDefenderXdr.schema?.safeParse({ cloud: 'commercial' });
    expect(result?.success).toBe(true);
  });

  it('schema accepts gcchigh cloud', () => {
    const result = MicrosoftDefenderXdr.schema?.safeParse({ cloud: 'gcchigh' });
    expect(result?.success).toBe(true);
  });

  it('schema accepts dod cloud', () => {
    const result = MicrosoftDefenderXdr.schema?.safeParse({ cloud: 'dod' });
    expect(result?.success).toBe(true);
  });

  it('schema rejects unknown cloud value', () => {
    const result = MicrosoftDefenderXdr.schema?.safeParse({ cloud: 'china' });
    expect(result?.success).toBe(false);
  });

  it('schema defaults cloud to commercial when omitted', () => {
    const result = MicrosoftDefenderXdr.schema?.safeParse({});
    expect(result?.success).toBe(true);
    expect((result as { success: true; data: { cloud: string } }).data?.cloud).toBe('commercial');
  });
});

// ---- Actions ----

describe('MicrosoftDefenderXdr actions', () => {
  it('defines all 20 actions', () => {
    const actions = Object.keys(MicrosoftDefenderXdr.actions ?? {});
    expect(actions).toEqual(
      expect.arrayContaining([
        'listIncidents',
        'getIncident',
        'updateIncident',
        'addIncidentComment',
        'listAlerts',
        'getAlert',
        'updateAlert',
        'runHuntingQuery',
        'listDetectionRules',
        'getDetectionRule',
        'createDetectionRule',
        'updateDetectionRule',
        'deleteDetectionRule',
        'addAlertComment',
        'mergeIncidents',
        'getThreatIntelHost',
        'getThreatIntelHostReputation',
        'getPassiveDnsRecords',
        'getWhoisRecord',
        'listSecureScores',
      ])
    );
  });

  it('read and triage actions have isTool: true', () => {
    const spec = MicrosoftDefenderXdr as ConnectorSpec;
    const toolActions = [
      'listIncidents',
      'getIncident',
      'updateIncident',
      'addIncidentComment',
      'listAlerts',
      'getAlert',
      'updateAlert',
      'addAlertComment',
      'runHuntingQuery',
      'listDetectionRules',
      'getDetectionRule',
      'getThreatIntelHost',
      'getThreatIntelHostReputation',
      'getPassiveDnsRecords',
      'getWhoisRecord',
      'listSecureScores',
    ];
    for (const name of toolActions) {
      expect(spec.actions?.[name]?.isTool).toBe(true);
    }
  });

  it('destructive actions have isTool: false', () => {
    const spec = MicrosoftDefenderXdr as ConnectorSpec;
    const nonToolActions = [
      'mergeIncidents',
      'createDetectionRule',
      'updateDetectionRule',
      'deleteDetectionRule',
    ];
    for (const name of nonToolActions) {
      expect(spec.actions?.[name]?.isTool).toBe(false);
    }
  });
});

// ---- Cloud routing ----

describe('cloud routing', () => {
  it('uses graph.microsoft.com for commercial cloud', async () => {
    const client = makeClient(() => ({ value: [] }));
    const ctx = makeCtx(client, { cloud: 'commercial' });
    await MicrosoftDefenderXdr.actions?.listIncidents?.handler(ctx as never, {
      top: 5,
      skip: 0,
      includeAlerts: false,
    });
    expect(client.get).toHaveBeenCalledWith(
      expect.stringContaining('graph.microsoft.com'),
      expect.any(Object)
    );
  });

  it('uses graph.microsoft.us for gcchigh cloud', async () => {
    const client = makeClient(() => ({ value: [] }));
    const ctx = makeCtx(client, { cloud: 'gcchigh' });
    await MicrosoftDefenderXdr.actions?.listIncidents?.handler(ctx as never, {
      top: 5,
      skip: 0,
      includeAlerts: false,
    });
    expect(client.get).toHaveBeenCalledWith(
      expect.stringContaining('graph.microsoft.us'),
      expect.any(Object)
    );
  });

  it('uses dod-graph.microsoft.us for dod cloud', async () => {
    const client = makeClient(() => ({ value: [] }));
    const ctx = makeCtx(client, { cloud: 'dod' });
    await MicrosoftDefenderXdr.actions?.listIncidents?.handler(ctx as never, {
      top: 5,
      skip: 0,
      includeAlerts: false,
    });
    expect(client.get).toHaveBeenCalledWith(
      expect.stringContaining('dod-graph.microsoft.us'),
      expect.any(Object)
    );
  });

  it('falls back to commercial when cloud is not set', async () => {
    const client = makeClient(() => ({ value: [] }));
    const ctx = makeCtx(client, {});
    await MicrosoftDefenderXdr.actions?.listIncidents?.handler(ctx as never, {
      top: 5,
      skip: 0,
      includeAlerts: false,
    });
    expect(client.get).toHaveBeenCalledWith(
      expect.stringContaining('graph.microsoft.com'),
      expect.any(Object)
    );
  });
});

// ---- listIncidents handler ----

describe('listIncidents handler', () => {
  it('calls GET /security/incidents with default params', async () => {
    const client = makeClient(() => ({ value: [{ id: '1' }] }));
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.listIncidents;
    const result = await action?.handler(ctx as never, { top: 25, skip: 0, includeAlerts: false });
    expect(client.get).toHaveBeenCalledWith(
      expect.stringContaining('/security/incidents'),
      expect.objectContaining({ params: expect.objectContaining({ $top: 25, $skip: 0 }) })
    );
    expect(result).toMatchObject({ value: [{ id: '1' }] });
  });

  it('adds $expand=alerts when includeAlerts is true', async () => {
    const client = makeClient(() => ({ value: [] }));
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.listIncidents;
    await action?.handler(ctx as never, { top: 10, skip: 0, includeAlerts: true });
    expect(client.get).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ params: expect.objectContaining({ $expand: 'alerts' }) })
    );
  });

  it('passes $filter when provided', async () => {
    const client = makeClient(() => ({ value: [] }));
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.listIncidents;
    await action?.handler(ctx as never, {
      top: 10,
      skip: 0,
      includeAlerts: false,
      filter: "status eq 'active'",
    });
    expect(client.get).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        params: expect.objectContaining({ $filter: "status eq 'active'" }),
      })
    );
  });

  it('throws a descriptive error on API failure', async () => {
    const client = makeClient();
    client.get = jest.fn().mockRejectedValue({
      response: { status: 403, data: { error: { code: 'Forbidden', message: 'Access denied' } } },
      message: 'Request failed',
    });
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.listIncidents;
    await expect(
      action?.handler(ctx as never, { top: 10, skip: 0, includeAlerts: false })
    ).rejects.toThrow('listIncidents failed (HTTP 403): Forbidden: Access denied');
  });
});

// ---- getIncident handler ----

describe('getIncident handler', () => {
  it('calls GET /security/incidents/{id} with $expand=alerts', async () => {
    const incident = { id: '42', status: 'active', alerts: [] };
    const client = makeClient(() => incident);
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.getIncident;
    const result = await action?.handler(ctx as never, { incidentId: '42' });
    expect(client.get).toHaveBeenCalledWith(
      expect.stringContaining('/security/incidents/42'),
      expect.objectContaining({ params: { $expand: 'alerts' } })
    );
    expect(result).toEqual(incident);
  });
});

// ---- updateIncident handler ----

describe('updateIncident handler', () => {
  it('calls PATCH /security/incidents/{id} with only provided fields', async () => {
    const client = makeClient();
    client.patch = jest.fn().mockResolvedValue({ data: { id: '5', status: 'resolved' } });
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.updateIncident;
    await action?.handler(ctx as never, {
      incidentId: '5',
      status: 'resolved',
      assignedTo: 'analyst@example.com',
    });
    expect(client.patch).toHaveBeenCalledWith(
      expect.stringContaining('/security/incidents/5'),
      { status: 'resolved', assignedTo: 'analyst@example.com' },
      expect.any(Object)
    );
  });

  it('does not send undefined fields or comment', async () => {
    const client = makeClient();
    client.patch = jest.fn().mockResolvedValue({ data: {} });
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.updateIncident;
    await action?.handler(ctx as never, { incidentId: '5', status: 'inProgress' });
    const body = client.patch.mock.calls[0][1] as Record<string, unknown>;
    expect(body).not.toHaveProperty('classification');
    expect(body).not.toHaveProperty('determination');
    expect(body).not.toHaveProperty('customTags');
    expect(body).not.toHaveProperty('comment');
  });

  it('accepts determination notMalicious through the schema', () => {
    const result = UpdateIncidentInputSchema.safeParse({
      incidentId: '5',
      classification: 'falsePositive',
      determination: 'notMalicious',
    });
    expect(result.success).toBe(true);
  });
});

// ---- addIncidentComment handler ----

describe('addIncidentComment handler', () => {
  it('calls POST /security/incidents/{id}/comments with comment body', async () => {
    const client = makeClient();
    client.post = jest.fn().mockResolvedValue({ data: { comment: 'Investigation note' } });
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.addIncidentComment;
    const result = await action?.handler(ctx as never, {
      incidentId: '42',
      comment: 'Investigation note',
    });
    expect(client.post).toHaveBeenCalledWith(
      expect.stringContaining('/security/incidents/42/comments'),
      { comment: 'Investigation note' },
      expect.any(Object)
    );
    expect(result).toMatchObject({ comment: 'Investigation note' });
  });

  it('throws a descriptive error on API failure', async () => {
    const client = makeClient();
    client.post = jest.fn().mockRejectedValue({
      response: {
        status: 404,
        data: { error: { code: 'NotFound', message: 'Incident not found' } },
      },
      message: 'Request failed',
    });
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.addIncidentComment;
    await expect(
      action?.handler(ctx as never, { incidentId: '999', comment: 'test' })
    ).rejects.toThrow('addIncidentComment failed (HTTP 404): NotFound: Incident not found');
  });
});

// ---- listAlerts handler ----

describe('listAlerts handler', () => {
  it('calls GET /security/alerts_v2 with default params', async () => {
    const client = makeClient(() => ({ value: [{ id: 'alert-1' }] }));
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.listAlerts;
    const result = await action?.handler(ctx as never, { top: 25, skip: 0 });
    expect(client.get).toHaveBeenCalledWith(
      expect.stringContaining('/security/alerts_v2'),
      expect.objectContaining({ params: { $top: 25, $skip: 0 } })
    );
    expect(result).toMatchObject({ value: [{ id: 'alert-1' }] });
  });
});

// ---- getAlert handler ----

describe('getAlert handler', () => {
  it('calls GET /security/alerts_v2/{id}', async () => {
    const alert = { id: 'alert-99', severity: 'high' };
    const client = makeClient(() => alert);
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.getAlert;
    const result = await action?.handler(ctx as never, { alertId: 'alert-99' });
    expect(client.get).toHaveBeenCalledWith(
      expect.stringContaining('/security/alerts_v2/alert-99'),
      expect.any(Object)
    );
    expect(result).toEqual(alert);
  });
});

// ---- updateAlert handler ----

describe('updateAlert handler', () => {
  it('calls PATCH /security/alerts_v2/{id} with provided fields (no severity)', async () => {
    const client = makeClient();
    client.patch = jest.fn().mockResolvedValue({ data: { id: 'alert-7', status: 'resolved' } });
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.updateAlert;
    await action?.handler(ctx as never, {
      alertId: 'alert-7',
      status: 'resolved',
      classification: 'truePositive',
      determination: 'malware',
    });
    expect(client.patch).toHaveBeenCalledWith(
      expect.stringContaining('/security/alerts_v2/alert-7'),
      { status: 'resolved', classification: 'truePositive', determination: 'malware' },
      expect.any(Object)
    );
  });

  it('does not include severity in the update body', async () => {
    const client = makeClient();
    client.patch = jest.fn().mockResolvedValue({ data: {} });
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.updateAlert;
    await action?.handler(ctx as never, {
      alertId: 'alert-7',
      status: 'inProgress',
    });
    const body = client.patch.mock.calls[0][1] as Record<string, unknown>;
    expect(body).not.toHaveProperty('severity');
  });

  it('rejects a severity-only update at the schema layer', () => {
    const result = UpdateAlertInputSchema.safeParse({
      alertId: 'alert-7',
      severity: 'high',
    });
    expect(result.success).toBe(false);
  });

  it('accepts determination notMalicious through the schema', () => {
    const result = UpdateAlertInputSchema.safeParse({
      alertId: 'alert-7',
      classification: 'falsePositive',
      determination: 'notMalicious',
    });
    expect(result.success).toBe(true);
  });
});

// ---- runHuntingQuery handler ----

describe('runHuntingQuery handler', () => {
  it('calls POST /security/runHuntingQuery with Query field', async () => {
    const client = makeClient();
    client.post = jest.fn().mockResolvedValue({
      data: {
        schema: [{ name: 'Timestamp', type: 'DateTime' }],
        results: [{ Timestamp: '2024-01-01T00:00:00Z' }],
        stats: null,
      },
    });
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.runHuntingQuery;
    const result = await action?.handler(ctx as never, {
      query: 'DeviceEvents | limit 1',
    });
    expect(client.post).toHaveBeenCalledWith(
      expect.stringContaining('/security/runHuntingQuery'),
      { Query: 'DeviceEvents | limit 1' },
      expect.any(Object)
    );
    expect(result).toMatchObject({ schema: expect.any(Array), results: expect.any(Array) });
  });

  it('includes Timespan when provided', async () => {
    const client = makeClient();
    client.post = jest.fn().mockResolvedValue({ data: { schema: [], results: [] } });
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.runHuntingQuery;
    await action?.handler(ctx as never, {
      query: 'DeviceEvents | limit 1',
      timespan: 'P1D',
    });
    expect(client.post).toHaveBeenCalledWith(
      expect.anything(),
      { Query: 'DeviceEvents | limit 1', Timespan: 'P1D' },
      expect.any(Object)
    );
  });
});

// ---- listDetectionRules handler ----

describe('listDetectionRules handler', () => {
  it('calls GET /security/rules/detectionRules with pagination params', async () => {
    const client = makeClient(() => ({ value: [{ id: '1', displayName: 'My Rule' }] }));
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.listDetectionRules;
    const result = await action?.handler(ctx as never, { top: 10, skip: 0 });
    expect(client.get).toHaveBeenCalledWith(
      expect.stringContaining('/security/rules/detectionRules'),
      expect.objectContaining({ params: expect.objectContaining({ $top: 10, $skip: 0 }) })
    );
    expect(result).toMatchObject({ value: [{ id: '1', displayName: 'My Rule' }] });
  });
});

// ---- getDetectionRule handler ----

describe('getDetectionRule handler', () => {
  it('calls GET /security/rules/detectionRules/{id}', async () => {
    const rule = { id: '42', displayName: 'Suspicious Process' };
    const client = makeClient(() => rule);
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.getDetectionRule;
    const result = await action?.handler(ctx as never, { ruleId: '42' });
    expect(client.get).toHaveBeenCalledWith(
      expect.stringContaining('/security/rules/detectionRules/42'),
      expect.any(Object)
    );
    expect(result).toEqual(rule);
  });
});

// ---- createDetectionRule handler ----

describe('createDetectionRule handler', () => {
  it('calls POST /security/rules/detectionRules with rule body', async () => {
    const client = makeClient();
    client.post = jest.fn().mockResolvedValue({ data: { id: '99', displayName: 'New Rule' } });
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.createDetectionRule;
    const result = await action?.handler(ctx as never, {
      displayName: 'New Rule',
      status: 'enabled',
      queryText: 'DeviceEvents | limit 10',
      period: 'PT1H',
      alertTemplate: { title: 'Alert Title', severity: 'high' },
    });
    expect(client.post).toHaveBeenCalledWith(
      expect.stringContaining('/security/rules/detectionRules'),
      expect.objectContaining({
        displayName: 'New Rule',
        queryCondition: { queryText: 'DeviceEvents | limit 10' },
        schedule: { frequency: 'PT1H' },
        detectionAction: expect.objectContaining({
          alertTemplate: expect.objectContaining({ title: 'Alert Title', severity: 'high' }),
        }),
      }),
      expect.any(Object)
    );
    expect(result).toMatchObject({ id: '99', displayName: 'New Rule' });
  });
});

// ---- updateDetectionRule handler ----

describe('updateDetectionRule handler', () => {
  it('calls PATCH /security/rules/detectionRules/{id} with only provided fields', async () => {
    const client = makeClient();
    client.patch = jest.fn().mockResolvedValue({ data: { id: '42', status: 'disabled' } });
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.updateDetectionRule;
    await action?.handler(ctx as never, { ruleId: '42', status: 'disabled' });
    expect(client.patch).toHaveBeenCalledWith(
      expect.stringContaining('/security/rules/detectionRules/42'),
      { status: 'disabled' },
      expect.any(Object)
    );
  });

  it('does not send undefined fields', async () => {
    const client = makeClient();
    client.patch = jest.fn().mockResolvedValue({ data: {} });
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.updateDetectionRule;
    await action?.handler(ctx as never, { ruleId: '42', displayName: 'Renamed Rule' });
    const body = client.patch.mock.calls[0][1] as Record<string, unknown>;
    expect(body).not.toHaveProperty('queryText');
    expect(body).not.toHaveProperty('period');
  });
});

// ---- deleteDetectionRule handler ----

describe('deleteDetectionRule handler', () => {
  it('calls DELETE /security/rules/detectionRules/{id}', async () => {
    const client = makeClient();
    client.delete = jest.fn().mockResolvedValue({ data: {} });
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.deleteDetectionRule;
    const result = await action?.handler(ctx as never, { ruleId: '42' });
    expect(client.delete).toHaveBeenCalledWith(
      expect.stringContaining('/security/rules/detectionRules/42'),
      expect.any(Object)
    );
    expect(result).toMatchObject({ deleted: true, ruleId: '42' });
  });
});

// ---- test handler ----

describe('test handler', () => {
  it('fetches one incident and returns connected: true', async () => {
    const client = makeClient(() => ({ value: [{ id: '1' }] }));
    const ctx = makeCtx(client);
    const result = await MicrosoftDefenderXdr.test?.handler(ctx as never);
    expect(result).toMatchObject({ connected: true, incidentsReturned: 1 });
  });

  it('throws on API failure', async () => {
    const client = makeClient();
    client.get = jest.fn().mockRejectedValue({
      response: {
        status: 401,
        data: { error: { code: 'Unauthorized', message: 'Invalid token' } },
      },
      message: 'Request failed',
    });
    const ctx = makeCtx(client);
    await expect(MicrosoftDefenderXdr.test?.handler(ctx as never)).rejects.toThrow(
      'test failed (HTTP 401): Unauthorized: Invalid token'
    );
  });
});

// ---- addAlertComment handler ----

describe('addAlertComment handler', () => {
  it('calls POST /security/alerts_v2/{id}/comments with comment body', async () => {
    const client = makeClient();
    client.post = jest.fn().mockResolvedValue({ data: { comment: 'Triage note' } });
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.addAlertComment;
    const result = await action?.handler(ctx as never, {
      alertId: 'alert-123',
      comment: 'Triage note',
    });
    expect(client.post).toHaveBeenCalledWith(
      expect.stringContaining('/security/alerts_v2/alert-123/comments'),
      { comment: 'Triage note' },
      expect.any(Object)
    );
    expect(result).toMatchObject({ comment: 'Triage note' });
  });

  it('throws a descriptive error on API failure', async () => {
    const client = makeClient();
    client.post = jest.fn().mockRejectedValue({
      response: {
        status: 404,
        data: { error: { code: 'NotFound', message: 'Alert not found' } },
      },
      message: 'Request failed',
    });
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.addAlertComment;
    await expect(
      action?.handler(ctx as never, { alertId: 'missing', comment: 'note' })
    ).rejects.toThrow('addAlertComment failed (HTTP 404): NotFound: Alert not found');
  });
});

// ---- mergeIncidents handler ----

describe('mergeIncidents handler', () => {
  it('calls POST /security/incidents/mergeIncidents with incidentIds and incidentComment', async () => {
    const client = makeClient();
    client.post = jest
      .fn()
      .mockResolvedValue({ data: { id: '1', redirectedIncidentIds: ['2', '3'] } });
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.mergeIncidents;
    const result = await action?.handler(ctx as never, {
      incidentIds: ['1', '2', '3'],
      comment: 'Same attack campaign',
    });
    expect(client.post).toHaveBeenCalledWith(
      expect.stringContaining('/security/incidents/mergeIncidents'),
      expect.objectContaining({
        incidentIds: ['1', '2', '3'],
        incidentComment: 'Same attack campaign',
      }),
      expect.any(Object)
    );
    expect(result).toMatchObject({ id: '1' });
  });

  it('maps comment input field to incidentComment in the request body', async () => {
    const client = makeClient();
    client.post = jest.fn().mockResolvedValue({ data: { id: '10' } });
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.mergeIncidents;
    await action?.handler(ctx as never, {
      incidentIds: ['10', '11'],
      comment: 'Same campaign',
    });
    const body = client.post.mock.calls[0][1] as Record<string, unknown>;
    expect(body.incidentComment).toBe('Same campaign');
    expect(body).not.toHaveProperty('comment');
  });

  it('includes mergeReasons as comma-joined string when provided', async () => {
    const client = makeClient();
    client.post = jest.fn().mockResolvedValue({ data: { id: '5' } });
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.mergeIncidents;
    await action?.handler(ctx as never, {
      incidentIds: ['5', '6'],
      comment: 'Same source',
      mergeReasons: ['sameThreatSource', 'sameTargetedAsset'],
    });
    const body = client.post.mock.calls[0][1] as Record<string, unknown>;
    expect(body.mergeReasons).toBe('sameThreatSource,sameTargetedAsset');
  });
});

// ---- getThreatIntelHost handler ----

describe('getThreatIntelHost handler', () => {
  it('calls GET /security/threatIntelligence/hosts/{host}', async () => {
    const tiData = { id: 'contoso.com', firstSeenDateTime: '2024-01-01T00:00:00Z' };
    const client = makeClient(() => tiData);
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.getThreatIntelHost;
    const result = await action?.handler(ctx as never, { host: 'contoso.com' });
    expect(client.get).toHaveBeenCalledWith(
      expect.stringContaining('/security/threatIntelligence/hosts/contoso.com'),
      expect.any(Object)
    );
    expect(result).toEqual(tiData);
  });

  it('URL-encodes the host parameter', async () => {
    const client = makeClient(() => ({}));
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.getThreatIntelHost;
    await action?.handler(ctx as never, { host: 'contoso.com:443' });
    expect(client.get).toHaveBeenCalledWith(
      expect.stringContaining('contoso.com%3A443'),
      expect.any(Object)
    );
  });
});

// ---- getThreatIntelHostReputation handler ----

describe('getThreatIntelHostReputation handler', () => {
  it('calls GET /security/threatIntelligence/hosts/{host}/reputation', async () => {
    const reputation = { score: 85, classification: 'malicious' };
    const client = makeClient(() => reputation);
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.getThreatIntelHostReputation;
    const result = await action?.handler(ctx as never, { host: 'evil.example.com' });
    expect(client.get).toHaveBeenCalledWith(
      expect.stringContaining('/security/threatIntelligence/hosts/evil.example.com/reputation'),
      expect.any(Object)
    );
    expect(result).toEqual(reputation);
  });
});

// ---- getPassiveDnsRecords handler ----

describe('getPassiveDnsRecords handler', () => {
  it('calls GET /security/threatIntelligence/hosts/{host}/passivedns and returns value array', async () => {
    const records = [{ firstSeenDateTime: '2024-01-01', artifact: { id: '1.2.3.4' } }];
    const client = makeClient(() => ({ value: records }));
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.getPassiveDnsRecords;
    const result = await action?.handler(ctx as never, { host: 'contoso.com' });
    expect(client.get).toHaveBeenCalledWith(
      expect.stringContaining('/security/threatIntelligence/hosts/contoso.com/passivedns'),
      expect.any(Object)
    );
    expect(result).toMatchObject({ value: records, nextLink: null });
  });

  it('propagates nextLink when present', async () => {
    const client = makeClient(() => ({
      value: [],
      '@odata.nextLink':
        'https://graph.microsoft.com/v1.0/security/threatIntelligence/hosts/x/passivedns?$skiptoken=abc',
    }));
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.getPassiveDnsRecords;
    const result = (await action?.handler(ctx as never, { host: 'x.example.com' })) as Record<
      string,
      unknown
    >;
    expect(result.nextLink).toContain('skiptoken');
  });
});

// ---- getWhoisRecord handler ----

describe('getWhoisRecord handler', () => {
  it('calls GET /security/threatIntelligence/hosts/{host}/whois', async () => {
    const whois = {
      registrar: { name: 'Example Registrar' },
      registrant: { organization: 'ACME' },
    };
    const client = makeClient(() => whois);
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.getWhoisRecord;
    const result = await action?.handler(ctx as never, { host: 'contoso.com' });
    expect(client.get).toHaveBeenCalledWith(
      expect.stringContaining('/security/threatIntelligence/hosts/contoso.com/whois'),
      expect.any(Object)
    );
    expect(result).toEqual(whois);
  });
});

// ---- listSecureScores handler ----

describe('listSecureScores handler', () => {
  it('calls GET /security/secureScores with $top param', async () => {
    const scores = [{ id: '2024-01-15', currentScore: 72 }];
    const client = makeClient(() => ({ value: scores }));
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.listSecureScores;
    const result = await action?.handler(ctx as never, { top: 10 });
    expect(client.get).toHaveBeenCalledWith(
      expect.stringContaining('/security/secureScores'),
      expect.objectContaining({ params: { $top: 10 } })
    );
    expect(result).toMatchObject({ value: scores, nextLink: null });
  });

  it('defaults top to 25 when not supplied', async () => {
    const client = makeClient(() => ({ value: [] }));
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.listSecureScores;
    await action?.handler(ctx as never, { top: 25 });
    expect(client.get).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ params: { $top: 25 } })
    );
  });

  it('throws a descriptive error on API failure', async () => {
    const client = makeClient();
    client.get = jest.fn().mockRejectedValue({
      response: {
        status: 403,
        data: { error: { code: 'Forbidden', message: 'Insufficient scope' } },
      },
      message: 'Request failed',
    });
    const ctx = makeCtx(client);
    const action = MicrosoftDefenderXdr.actions?.listSecureScores;
    await expect(action?.handler(ctx as never, { top: 5 })).rejects.toThrow(
      'listSecureScores failed (HTTP 403): Forbidden: Insufficient scope'
    );
  });
});
