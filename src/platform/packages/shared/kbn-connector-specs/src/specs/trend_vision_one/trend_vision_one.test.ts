/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import { join } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { z } from '@kbn/zod/v4';
import { REGION_HOSTS } from './constants';
import { ACTION_DESCRIPTIONS } from './descriptions';
import { ListEndpointsInputSchema, ListOatInputSchema } from './types';
import { TrendVisionOne } from './trend_vision_one';
import {
  AGENT_GUID,
  API,
  ctx,
  deref,
  httpError,
  ok,
  parseInput,
  request,
  resetMocksAroundEachTest,
  run,
  sent,
  setVendorSpec,
  specFieldSchemas,
  specOperationOf,
  vendorError,
} from './test_helpers';

resetMocksAroundEachTest();

// Expectations come from the recorded vendor spec (vendor_api/), never from the connector code.
const readVendorFile = (...path: string[]) =>
  JSON.parse(fs.readFileSync(join(__dirname, 'vendor_api', ...path), 'utf8'));
setVendorSpec({
  manifest: readVendorFile('manifest.json'),
  snapshot: readVendorFile('snapshots', 'vision_one.openapi.json'),
});

const NOT_TOOLS = [
  'addAlertNote',
  'addToExceptionList',
  'collectForensicFile',
  'deleteEmailMessage',
  'disableUserAccount',
  'enableUserAccount',
  'forceUserSignOut',
  'quarantineEmailMessage',
  'removeFromSuspiciousObjectList',
  'restoreEndpointConnection',
  'submitFileToSandbox',
  'submitUrlsToSandbox',
  'terminateProcess',
  'updateAlertStatus',
];

describe('TrendAI Vision One connector definition', () => {
  it('ships Agent Builder only, on the enterprise license', () => {
    expect(TrendVisionOne.metadata).toMatchObject({
      id: '.trend_vision_one',
      displayName: 'TrendAI Vision One',
      minimumLicense: 'enterprise',
      supportedFeatureIds: ['agentBuilder'],
      isTechnicalPreview: true,
    });
    expect(TrendVisionOne.test?.enabled).toBe(true);
  });

  it('has the 22 actions of the design', () => {
    expect(Object.keys(TrendVisionOne.actions)).toHaveLength(22);
  });

  it('keeps the risky actions away from agents and every other action available', () => {
    const notTools = Object.entries(TrendVisionOne.actions)
      .filter(([, action]) => action.isTool === false)
      .map(([name]) => name)
      .sort();
    expect(notTools).toEqual(NOT_TOOLS);
  });

  it('marks reads as read and changes as write or destroy', () => {
    const scopes = Object.fromEntries(
      Object.entries(TrendVisionOne.actions).map(([name, action]) => [name, action.scope])
    );
    for (const name of [
      'listAlerts',
      'getAlertDetails',
      'listEndpoints',
      'listObservedAttackTechniques',
      'getResponseTaskStatus',
      'getSandboxAnalysisResult',
    ]) {
      expect(scopes[name]).toBe('read');
    }
    for (const name of [
      'updateAlertStatus',
      'isolateEndpoint',
      'terminateProcess',
      'deleteEmailMessage',
      'removeFromSuspiciousObjectList',
    ]) {
      expect(scopes[name]).toBe('destroy');
    }
  });

  it('defaults the region to India', () => {
    expect(TrendVisionOne.schema?.parse({})).toEqual({
      apiUrl: 'https://api.in.xdr.trendmicro.com',
    });
  });

  it('checks apiUrl against the Kibana allowed hosts list, asks for https and lists every region in the help text', () => {
    expect(TrendVisionOne.validateUrls).toEqual({ fields: ['apiUrl'] });
    const helpText = String(
      (TrendVisionOne.schema?.shape.apiUrl.meta() as { helpText?: string } | undefined)?.helpText
    );
    for (const host of Object.values(REGION_HOSTS)) {
      expect(helpText).toContain(`https://${host}`);
    }
    expect(helpText).toContain('India: https://api.in.xdr.trendmicro.com (default)');
    expect(helpText).toContain('not the console address (portal...)');
    expect(helpText).toContain('with https and without a path, query string or fragment');
    expect(helpText).toContain('allowed hosts');
  });

  it.each([
    ['http://api.in.xdr.trendmicro.com', 'TrendAI Vision One API URL must use https.'],
    ['https://portal.in.xdr.trendmicro.com', 'looks like the console address (portal...)'],
    ['https://api.in.xdr.trendmicro.com?x=1', 'must not have a query string (?...)'],
    ['https://api.in.xdr.trendmicro.com#x', 'must not have a fragment (#...)'],
    ['https://api.in.xdr.trendmicro.com/v3.0', 'must not have a path (/v3.0)'],
  ])('refuses apiUrl %s when the connector is saved', (apiUrl, message) => {
    const result = TrendVisionOne.schema?.safeParse({ apiUrl });
    expect(result?.success).toBe(false);
    expect(result?.error?.issues.map((issue) => issue.message).join(' ')).toContain(message);
  });

  it.each([
    'https://api.xdr.trendmicro.com',
    'https://api.eu.xdr.trendmicro.com/',
    'http://localhost:8080',
    'http://127.0.0.1:9443',
    'http://[::1]:9443',
  ])('accepts apiUrl %s when the connector is saved', (apiUrl) => {
    expect(TrendVisionOne.schema?.safeParse({ apiUrl }).success).toBe(true);
  });
});

describe('TrendAI Vision One agent skill', () => {
  const skill = String(TrendVisionOne.skill);
  const named = new Set(skill.match(/`(\w+)`/g)?.map((name) => name.slice(1, -1)));

  it('names only actions that agents can use', () => {
    const tools = Object.entries(TrendVisionOne.actions)
      .filter(([, action]) => action.isTool !== false)
      .map(([name]) => name)
      .sort();
    expect([...named].sort()).toEqual(tools);
  });

  it('asks the agent to confirm before isolating or blocking and says a person undoes them', () => {
    expect(skill).toContain(
      'Confirm with the user before `isolateEndpoint` and `addToSuspiciousObjectList`: the agent cannot undo them'
    );
    for (const name of ['isolateEndpoint', 'addToSuspiciousObjectList']) {
      expect(TrendVisionOne.actions[name].isTool).toBe(true);
      expect(TrendVisionOne.actions[name].description).toContain('Confirm with the user first');
    }
  });

  it('keeps the descriptions of agent tools free of actions agents cannot use', () => {
    const hidden = Object.entries(TrendVisionOne.actions)
      .filter(([, action]) => action.isTool === false)
      .map(([name]) => name);
    for (const action of Object.values(TrendVisionOne.actions)) {
      if (action.isTool === false) continue;
      for (const other of hidden) expect(String(action.description)).not.toContain(other);
    }
  });
});

describe('TrendAI Vision One connectivity test', () => {
  it('calls the connectivity check', async () => {
    request.mockResolvedValueOnce(ok({ status: 'available' }));
    await expect(TrendVisionOne.test?.handler(ctx)).resolves.toEqual({
      message: 'Connected to TrendAI Vision One (available)',
    });
    expect(sent()).toMatchObject({ method: 'GET', url: `${API}/healthcheck/connectivity` });
  });

  it('fails on an invalid key', async () => {
    request.mockRejectedValueOnce(httpError(401, vendorError('Unauthorized', 'Invalid token')));
    await expect(TrendVisionOne.test?.handler(ctx)).rejects.toThrow(
      'Check the API key and that the region'
    );
  });
});

describe('TrendAI Vision One listEndpoints', () => {
  it('combines agentGuid, endpointName and the filter into one TMV1-Filter', async () => {
    request.mockResolvedValueOnce(
      ok({ totalCount: 1, count: 1, items: [{ agentGuid: AGENT_GUID }] })
    );
    const result = await run('listEndpoints', {
      agentGuid: AGENT_GUID,
      endpointName: 'lab-win-01',
      filter: "osPlatform eq 'windows'",
      top: 50,
      select: ['agentGuid', 'endpointName', 'isolationStatus'],
      orderBy: 'eppAgentLastConnectedDateTime desc',
    });
    expect(sent()).toMatchObject({
      method: 'GET',
      url: `${API}/endpointSecurity/endpoints`,
      params: {
        top: 50,
        select: 'agentGuid,endpointName,isolationStatus',
        orderBy: 'eppAgentLastConnectedDateTime desc',
      },
      headers: {
        'TMV1-Filter': `agentGuid eq '${AGENT_GUID}' and endpointName eq 'lab-win-01' and (osPlatform eq 'windows')`,
      },
    });
    expect(result).toEqual({
      totalCount: 1,
      count: 1,
      items: [{ agentGuid: AGENT_GUID }],
      nextLink: null,
    });
  });

  it.each([
    [{ endpointName: '   ' }, undefined],
    [{ endpointName: '  lab-win-01 ' }, "endpointName eq 'lab-win-01'"],
    [{ endpointName: 'lab win 01', filter: '  ' }, "endpointName eq 'lab win 01'"],
  ])('sends %j as TMV1-Filter %s (values trimmed, blanks dropped)', async (input, filter) => {
    request.mockResolvedValueOnce(ok({ totalCount: 0, count: 0, items: [] }));
    await run('listEndpoints', input);
    expect(sent().headers?.['TMV1-Filter']).toBe(filter);
  });

  it('rejects a combined filter over 1024 characters before any request', async () => {
    await expect(
      run('listEndpoints', { endpointName: 'n'.repeat(255), filter: 'f'.repeat(1000) })
    ).rejects.toThrow('at most 1024');
    expect(request).not.toHaveBeenCalled();
  });

  it('reads the next page from a checked nextLink with the same filter', async () => {
    const link = `${API}/endpointSecurity/endpoints?top=10&skipToken=2`;
    request.mockResolvedValueOnce(ok({ items: [] }));
    await run('listEndpoints', { endpointName: 'lab', nextLink: link });
    expect(sent()).toMatchObject({
      url: link,
      params: undefined,
      headers: { 'TMV1-Filter': "endpointName eq 'lab'" },
    });
  });

  it.each([
    [{ top: 20 }],
    [{ orderBy: 'endpointName asc' }],
    [{ select: ['agentguid'] }],
    [{ agentGuid: 'abc' }],
    [{ filter: 'f'.repeat(1025) }],
  ])('rejects %j at the schema', (input) => {
    expect(parseInput('listEndpoints', input).success).toBe(false);
  });
});

describe('TrendAI Vision One listObservedAttackTechniques', () => {
  it('sends the time ranges, top and the filter, and returns one page', async () => {
    const next = `${API}/oat/detections?skipToken=2`;
    request.mockResolvedValueOnce(
      ok({ totalCount: 300, count: 1, items: [{ id: 'oat-1' }], nextLink: next })
    );
    const result = await run('listObservedAttackTechniques', {
      detectedStartDateTime: '2026-11-01T00:00:00Z',
      detectedEndDateTime: '2026-11-20T00:00:00Z',
      top: 100,
      filter: "riskLevel eq 'high'",
    });
    expect(sent()).toMatchObject({
      url: `${API}/oat/detections`,
      params: {
        detectedStartDateTime: '2026-11-01T00:00:00Z',
        detectedEndDateTime: '2026-11-20T00:00:00Z',
        top: 100,
      },
      headers: { 'TMV1-Filter': "riskLevel eq 'high'" },
    });
    expect(result).toEqual({ totalCount: 300, count: 1, items: [{ id: 'oat-1' }], nextLink: next });
  });

  it('refuses a nextLink for another list', async () => {
    await expect(
      run('listObservedAttackTechniques', { nextLink: `${API}/workbench/alerts?skipToken=2` })
    ).rejects.toThrow('nextLink must point to');
  });

  it.each([
    [{ top: 10 }],
    [{ top: 200 }],
    [{ detectedStartDateTime: 'yesterday' }],
    [{ filter: 'f'.repeat(4001) }],
    [{ detectedStartDateTime: '2026-11-01T00:00:00Z' }],
    [{ detectedEndDateTime: '2026-11-20T00:00:00Z' }],
    [{ ingestedStartDateTime: '2026-11-01T00:00:00Z' }],
    [{ ingestedEndDateTime: '2026-11-20T00:00:00Z' }],
  ])('rejects %j at the schema', (input) => {
    expect(parseInput('listObservedAttackTechniques', input).success).toBe(false);
  });

  it.each([
    [{}],
    [
      {
        ingestedStartDateTime: '2026-11-01T00:00:00Z',
        ingestedEndDateTime: '2026-11-20T00:00:00Z',
      },
    ],
  ])('accepts %j (no range, or both bounds of a range)', (input) => {
    expect(parseInput('listObservedAttackTechniques', input).success).toBe(true);
  });
});

describe('TrendAI Vision One input bounds and the text that states them', () => {
  const words = (text: string) => new Set(text.match(/\d+/g) ?? []);

  it('listEndpoints top takes exactly the page sizes its description lists, at most 200', () => {
    const sizes = [10, 50, 100, 200];
    for (const top of sizes) expect(parseInput('listEndpoints', { top }).success).toBe(true);
    for (const top of [1, 20, 201, 500, 1000])
      expect(parseInput('listEndpoints', { top }).success).toBe(false);
    const described = String(ListEndpointsInputSchema.shape.top.description);
    expect([...words(described)].map(Number).sort((a, b) => a - b)).toEqual(sizes);
  });

  it('listObservedAttackTechniques top takes exactly the page sizes its description lists, at most 100', () => {
    const sizes = [50, 100];
    for (const top of sizes)
      expect(parseInput('listObservedAttackTechniques', { top }).success).toBe(true);
    for (const top of [10, 101, 200])
      expect(parseInput('listObservedAttackTechniques', { top }).success).toBe(false);
    const described = String(ListOatInputSchema.shape.top.description);
    expect([...words(described)].map(Number).sort((a, b) => a - b)).toEqual(sizes);
  });

  it('submitUrlsToSandbox takes 1 to 10 URLs, as its description says', () => {
    const url = 'https://test-elastic-soar.invalid/';
    expect(parseInput('submitUrlsToSandbox', { urls: Array(10).fill(url) }).success).toBe(true);
    expect(parseInput('submitUrlsToSandbox', { urls: Array(11).fill(url) }).success).toBe(false);
    expect(ACTION_DESCRIPTIONS.submitUrlsToSandbox).toContain('Submit 1 to 10 URLs');
  });

  describe('accepts exactly the values the vendor spec enumerates', () => {
    /** Every enum or const value a JSON schema node allows, through unions and array items. */
    const allowed = (node: Record<string, unknown> | undefined): unknown[] => {
      if (!node) return [];
      const parts = [
        ...((node.anyOf ?? []) as Array<Record<string, unknown>>),
        ...((node.oneOf ?? []) as Array<Record<string, unknown>>),
        ...(node.items ? [node.items as Record<string, unknown>] : []),
      ];
      return [
        ...((node.enum ?? []) as unknown[]),
        ...('const' in node ? [node.const] : []),
        ...parts.flatMap(allowed),
      ];
    };
    const accepted = (action: string, field: string): unknown[] => {
      const json = z.toJSONSchema(TrendVisionOne.actions[action].input, { io: 'input' }) as {
        properties?: Record<string, Record<string, unknown>>;
      };
      return allowed(json.properties?.[field]);
    };
    const specEnum = (action: string, where: 'query' | 'body', field: string): unknown[] =>
      specFieldSchemas(specOperationOf(action).spec, where, field).flatMap(
        (schema) => (schema.enum ?? deref(schema.items ?? {}).enum ?? []) as unknown[]
      );
    const sorted = (values: unknown[]) => [...new Set(values.map(String))].sort();

    it.each([
      ['listAlerts', 'query', 'dateTimeTarget'],
      ['listEndpoints', 'query', 'select'],
      ['updateAlertStatus', 'body', 'status'],
      ['updateAlertStatus', 'body', 'investigationResult'],
      ['addToSuspiciousObjectList', 'body', 'scanAction'],
      ['addToSuspiciousObjectList', 'body', 'riskLevel'],
    ] as const)('%s %s %s', (action, where, field) => {
      const expected = specEnum(action, where, field);
      expect(expected.length).toBeGreaterThan(0);
      expect(sorted(accepted(action, field))).toEqual(sorted(expected));
    });

    it.each([
      ['listEndpoints', 200],
      ['listObservedAttackTechniques', 100],
    ] as const)(
      '%s top takes spec page sizes only, capped at %s for the 1 MB response limit',
      (action, cap) => {
        const expected = specEnum(action, 'query', 'top').map(Number);
        const values = accepted(action, 'top').map(Number);
        expect(values.length).toBeGreaterThan(0);
        expect(values).toEqual(expected.filter((size) => size <= cap));
      }
    );
  });

  it('listObservedAttackTechniques states the same retention as the docs page', () => {
    const docs = fs.readFileSync(
      join(REPO_ROOT, 'docs/reference/connectors-kibana/trend-vision-one-action-type.md'),
      'utf8'
    );
    const days = docs.match(/older than (\d+) days/)?.[1];
    expect(days).toBe('365');
    expect(ACTION_DESCRIPTIONS.listObservedAttackTechniques).toContain(`(last ${days} days)`);
  });

  it('listEndpoints select is limited to 128 characters joined with commas', () => {
    const at128 = [
      'eppAgentVirtualMachineDetailsCloudInstanceId',
      'eppAgentVirtualMachineDetailsCloudAccountId',
      'eppAgentVirtualMachineDetailsPowerState',
    ];
    const at129 = [
      'eppAgentVirtualMachineDetailsPowerState',
      'securityPolicyOverriddenStatus',
      'edrSensorComponentUpdatePolicy',
      'eppAgentLastScannedDateTime',
    ];
    expect(at128.join(',')).toHaveLength(128);
    expect(at129.join(',')).toHaveLength(129);
    expect(parseInput('listEndpoints', { select: at128 }).success).toBe(true);
    expect(parseInput('listEndpoints', { select: at129 }).success).toBe(false);
  });

  it.each(['listAlerts', 'listObservedAttackTechniques', 'listEndpoints'])(
    '%s takes a nextLink of up to 4096 characters',
    (name) => {
      const link = (n: number) =>
        `https://api.in.xdr.trendmicro.com/v3.0/x?skipToken=`.padEnd(n, 'a');
      expect(parseInput(name, { nextLink: link(4096) }).success).toBe(true);
      expect(parseInput(name, { nextLink: link(4097) }).success).toBe(false);
    }
  );
});
