/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getConnectorSpec } from '../../..';
import { SentinelOne } from './sentinelone';
import type { RequestCase } from './test_helpers';
import {
  API,
  AUTH,
  ctx,
  expectDocumentedRequest,
  httpError,
  listBody,
  request,
  resetMocksAroundEachTest,
  run,
  TOKEN,
} from './test_helpers';

resetMocksAroundEachTest();

describe('SentinelOne (v2) spec', () => {
  it('is registered under .sentinelone2 with the agreed metadata', () => {
    expect(getConnectorSpec('.sentinelone2')).toBe(SentinelOne);
    expect(SentinelOne.metadata.displayName).toBe('SentinelOne (v2)');
    expect(SentinelOne.metadata.minimumLicense).toBe('enterprise');
    expect(SentinelOne.metadata.supportedFeatureIds).toContain('agentBuilder');
    expect(SentinelOne.test?.enabled).toBe(true);
  });

  it('declares 54 actions, each with a scope and a description', () => {
    const names = Object.keys(SentinelOne.actions);
    // 57 TDD actions minus the 5 deprecated routes left out, plus getApplicationCves and runQuery that cover them
    expect(names).toHaveLength(54);
    expect(names).toContain('fetchThreatFile');
    for (const v1 of [
      'executeScript',
      'getAgents',
      'isolateHost',
      'releaseHost',
      'getRemoteScripts',
      'getRemoteScriptStatus',
      'getRemoteScriptResults',
      'downloadRemoteScriptResults',
      'fetchAgentFiles',
      'downloadAgentFile',
      'getActivities',
    ]) {
      expect(names).toContain(v1);
    }
    for (const action of Object.values(SentinelOne.actions)) {
      expect(action.scope).toBeDefined();
      expect(action.description?.length).toBeGreaterThan(40);
    }
  });

  it('keeps exactly the 11 high-risk actions away from Agent Builder (isTool false) and exposes every other action', () => {
    const notTools = [
      'executeScript',
      'runScriptAndWait',
      'shutdownAgent',
      'createExclusion',
      'deleteExclusion',
      'removeHashFromBlocklist',
      'disableStarRules',
      'deleteStarRule',
      'deleteFirewallRule',
      'deleteIOC',
      'moveAgent',
    ];
    const actualNotTools = Object.entries(SentinelOne.actions)
      .filter(([, action]) => action.isTool === false)
      .map(([name]) => name);
    expect(actualNotTools.sort()).toEqual([...notTools].sort());
    for (const [name, action] of Object.entries(SentinelOne.actions)) {
      if (!notTools.includes(name)) {
        expect({ name, isTool: action.isTool }).toEqual({ name, isTool: true });
      }
    }
  });

  it('leaves out the deprecated SentinelOne routes', () => {
    for (const name of [
      'getAgentCves',
      'getHashReputation',
      'createQuery',
      'getQueryStatus',
      'getQueryEvents',
    ]) {
      expect(SentinelOne.actions).not.toHaveProperty(name);
    }
    expect(SentinelOne.actions).toHaveProperty('getApplicationCves');
    expect(SentinelOne.actions).toHaveProperty('runQuery');
  });

  it('test handler lists one agent with the ApiToken header', async () => {
    request.mockResolvedValue({ status: 200, data: listBody([{ id: '1' }]) });
    await expect(SentinelOne.test?.handler(ctx)).resolves.toEqual(
      expect.objectContaining({ totalItems: 1 })
    );
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: `${API}/agents`,
        params: { limit: 1 },
        headers: AUTH,
        timeout: 60_000,
      })
    );
    // JSON requests keep the Kibana Actions response size limit (only downloads set their own cap)
    expect(request.mock.calls[0][0]).not.toHaveProperty('maxContentLength');
  });

  it('test handler fails on a rejected token', async () => {
    request.mockRejectedValue(
      httpError(401, { errors: [{ code: 4010010, title: 'Unauthorized' }] })
    );
    await expect(SentinelOne.test?.handler(ctx)).rejects.toThrow(
      'Status code: 401. Message: Unauthorized API Error (401) 4010010 Unauthorized. Check the API token and the tenant URL'
    );
  });
});

/** One row per single-request action: input, then the exact request it must send. */
const REQUEST_CASES: RequestCase[] = [
  [
    'getSites',
    { query: 'prod', sortBy: 'name' },
    { method: 'GET', path: '/sites', params: { query: 'prod', sortBy: 'name' } },
  ],
  [
    'getGroups',
    { siteIds: ['21'], type: 'static' },
    { method: 'GET', path: '/groups', params: { siteIds: '21', type: 'static' } },
  ],
  ['getAccounts', { limit: 3 }, { method: 'GET', path: '/accounts', params: { limit: 3 } }],
];

describe('request shapes', () => {
  it.each(REQUEST_CASES)('%s sends the documented request', expectDocumentedRequest);

  it('never puts the token in the query string', async () => {
    request.mockResolvedValue({ status: 200, data: listBody() });
    await run('getAgents', { computerName: 'host-1' });
    const sent = request.mock.calls[0][0];
    expect(JSON.stringify(sent.params)).not.toContain(TOKEN);
    expect(sent.url).not.toContain(TOKEN);
  });
});

describe('list responses', () => {
  it('returns one page with nextCursor and totalItems, tolerating missing fields', async () => {
    request.mockResolvedValueOnce({
      status: 200,
      data: { data: [{ id: '1', extra: true }], pagination: { nextCursor: 'n2', totalItems: 7 } },
    });
    await expect(run('getAgents', { limit: 1 })).resolves.toEqual({
      data: [{ id: '1', extra: true }],
      pagination: { nextCursor: 'n2', totalItems: 7 },
      errors: null,
    });
    request.mockResolvedValueOnce({ status: 200, data: {} });
    await expect(run('getAccounts', {})).resolves.toEqual({
      data: [],
      pagination: { nextCursor: null, totalItems: null },
      errors: null,
    });
  });
});

describe('site and group responses', () => {
  it('getSites returns data.sites and data.allSites without registration tokens', async () => {
    request.mockResolvedValueOnce({
      status: 200,
      data: {
        data: {
          allSites: { activeLicenses: 3 },
          sites: [{ id: '21', name: 'Prod', registrationToken: 'enroll' }],
        },
        pagination: { nextCursor: null, totalItems: 1 },
      },
    });
    await expect(run('getSites', {})).resolves.toEqual({
      data: { sites: [{ id: '21', name: 'Prod' }], allSites: { activeLicenses: 3 } },
      pagination: { nextCursor: null, totalItems: 1 },
      errors: null,
    });
  });

  it('getGroups drops registration tokens', async () => {
    request.mockResolvedValueOnce({
      status: 200,
      data: listBody([{ id: '71', name: 'Default', registrationToken: 'enroll' }]),
    });
    const result = await run('getGroups', {});
    expect(JSON.stringify(result)).not.toContain('enroll');
    expect(result).toEqual(expect.objectContaining({ data: [{ id: '71', name: 'Default' }] }));
  });
});

describe('credential fields in responses', () => {
  it('getAgents redacts licenseKey', async () => {
    request.mockResolvedValueOnce({
      status: 200,
      data: listBody([{ id: '1', licenseKey: 'lic-secret', computerName: 'h1' }]),
    });
    const result = await run('getAgents', {});
    expect(result).toEqual(
      expect.objectContaining({
        data: [{ id: '1', licenseKey: '[redacted]', computerName: 'h1' }],
      })
    );
  });
});

describe('explicit targets on state-changing actions', () => {
  it.each([
    ['isolateHost', { agentIds: [] }],
    ['releaseHost', { agentIds: [] }],
    ['initiateScan', { agentIds: [] }],
    ['mitigateThreat', { action: 'kill', threatIds: [] }],
    ['updateThreatStatus', { threatIds: [], incidentStatus: 'resolved' }],
    ['updateAlertVerdict', { alertIds: [], analystVerdict: 'undefined' }],
    ['deleteStarRule', { ruleIds: [] }],
    ['removeHashFromBlocklist', { ids: [] }],
    ['deleteIOC', { accountIds: ['1'], uuids: [] }],
  ])('%s rejects an empty id list at the schema boundary', (name, input) => {
    expect(() => SentinelOne.actions[name].input.parse(input)).toThrow();
  });

  it('executeScript without a target fails with the V1 message before any call', async () => {
    await expect(
      run('executeScript', { scriptId: '91', taskDescription: 'Collect' })
    ).rejects.toThrow('A filter must be defined; either ids or uuids');
    expect(request).not.toHaveBeenCalled();
  });

  it.each([
    'addHashToBlocklist',
    'createExclusion',
    'createIOC',
    'createFirewallRule',
    'createStarRule',
  ])('%s requires an explicit scope', async (name) => {
    const inputs: Record<string, Record<string, unknown>> = {
      addHashToBlocklist: { osType: 'windows', sha1: 'c'.repeat(40) },
      createExclusion: { type: 'path', osType: 'linux', value: '/opt' },
      createIOC: { type: 'MD5', value: 'd'.repeat(32), source: 'Elastic' },
      createFirewallRule: { name: 'r', action: 'Block', status: 'Enabled' },
      createStarRule: { name: 'r', severity: 'Low', queryType: 'events', s1ql: 'x' },
    };
    await expect(run(name, inputs[name])).rejects.toThrow('needs an explicit scope');
    expect(request).not.toHaveBeenCalled();
  });

  it('addHashToBlocklist needs sha1 or sha256', async () => {
    await expect(run('addHashToBlocklist', { osType: 'windows', tenant: true })).rejects.toThrow(
      'addHashToBlocklist needs sha1 or sha256'
    );
  });

  it('fails a write when SentinelOne reports per-item errors in HTTP 200', async () => {
    request.mockResolvedValue({
      status: 200,
      data: {
        data: { affected: 0 },
        errors: [{ code: 4000040, title: 'Item error', detail: 'Already mitigated' }],
      },
    });
    await expect(run('mitigateThreat', { action: 'kill', threatIds: ['31'] })).rejects.toThrow(
      'SentinelOne did not apply mitigateThreat to 31: 4000040 Item error Already mitigated'
    );
  });

  it('fails a write when data.affected is 0', async () => {
    request.mockResolvedValue({ status: 200, data: { data: { affected: 0 } } });
    await expect(
      run('updateThreatVerdict', { threatIds: ['31'], analystVerdict: 'true_positive' })
    ).rejects.toThrow('SentinelOne reported 0 affected objects');
  });

  it.each([
    ['addHashToBlocklist', { osType: 'windows', sha1: 'c'.repeat(40), siteIds: ['21'] }],
    ['createExclusion', { type: 'path', osType: 'linux', value: '/opt', siteIds: ['21'] }],
    ['createIOC', { type: 'MD5', value: 'd'.repeat(32), source: 'Elastic', siteIds: ['21'] }],
  ])('%s fails when SentinelOne reports per-item errors in HTTP 200', async (name, input) => {
    request.mockResolvedValue({
      status: 200,
      data: {
        data: { affected: 0 },
        errors: [{ code: 4000010, title: 'Bad parameter given', detail: 'One or more items' }],
      },
    });
    await expect(run(name, input)).rejects.toThrow(`SentinelOne did not apply ${name}`);
  });

  it('listFirewallRules without any filter fails before any call', async () => {
    await expect(run('listFirewallRules', { limit: 5 })).rejects.toThrow(
      'listFirewallRules needs at least one filter'
    );
    expect(request).not.toHaveBeenCalled();
    request.mockResolvedValue({ status: 200, data: listBody() });
    await expect(run('listFirewallRules', { statuses: ['Enabled'] })).resolves.toBeDefined();
  });

  it('rejects unknown additionalFilters keys before the call', async () => {
    await expect(run('getAgents', { additionalFilters: { notAFilter: 'x' } })).rejects.toThrow(
      'unknown additionalFilters key(s) notAFilter'
    );
    expect(request).not.toHaveBeenCalled();
  });
});

describe('input bounds', () => {
  it.each([
    ['getAgents', { limit: 1001 }],
    ['getAgents', { limit: 0 }],
    ['isolateHost', { agentIds: Array.from({ length: 1001 }, (_, i) => String(i)) }],
    // Lookup-style ids go into a query string: capped at 300 so the URL stays under gateway limits.
    ['isolateHost', { agentIds: Array.from({ length: 301 }, (_, i) => String(i)) }],
    ['releaseHost', { agentIds: Array.from({ length: 301 }, (_, i) => String(i)) }],
    ['getInstalledApplications', { agentIds: Array.from({ length: 301 }, (_, i) => String(i)) }],
    ['getThreatDetails', { ids: Array.from({ length: 301 }, (_, i) => String(i)) }],
    ['broadcastMessage', { agentIds: ['1'], message: 'x'.repeat(141) }],
    [
      'fetchAgentFiles',
      {
        agentId: '1',
        files: Array.from({ length: 11 }, () => '/a'),
        zipPassCode: 'Secret-Pass-123',
      },
    ],
    ['fetchAgentFiles', { agentId: '1', files: ['/a'], zipPassCode: 'short' }],
    ['fetchThreatFile', { threatId: '1' }],
    ['fetchThreatFile', { threatId: '1', password: '' }],
    ['fetchThreatFile', { threatId: '1', password: 'short' }],
    ['fetchThreatFile', { threatId: '', password: 'Secret-Pass-123' }],
    ['fetchThreatFile', { threatIds: ['1'], password: 'Secret-Pass-123' }],
    ['addThreatNote', { threatIds: ['1'], text: 'x' }],
    [
      'runScriptAndWait',
      { agentIds: ['1'], scriptId: '1', taskDescription: 'ab', waitSeconds: 241 },
    ],
    ['getThreats', { ids: ['1,2'] }],
    [
      'getAgents',
      { additionalFilters: Object.fromEntries(Array.from({ length: 51 }, (_, i) => [`k${i}`, 1])) },
    ],
  ])('%s rejects %j', (name, input) => {
    expect(() => SentinelOne.actions[name].input.parse(input)).toThrow();
  });
});
