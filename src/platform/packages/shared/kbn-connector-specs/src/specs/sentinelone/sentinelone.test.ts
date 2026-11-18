/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { getConnectorSpec } from '../../..';
import { ApiKeyHeaderAuth } from '../../auth_types/api_key_header';
import { timers } from './client';
import { SentinelOne } from './sentinelone';

const CONSOLE = 'https://tenant.sentinelone.net';
const API = `${CONSOLE}/web/api/v2.1`;
const TOKEN = 'unit-test-token';
const AUTH = { Authorization: `ApiToken ${TOKEN}`, token: false };

const request = jest.fn();
const ctx = {
  client: { request },
  config: { url: CONSOLE },
  secrets: { authType: 'api_key_header', token: TOKEN },
  log: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() },
} as unknown as ActionContext;

const run = (name: string, input: Record<string, unknown>) => {
  const action = SentinelOne.actions[name];
  return action.handler(ctx, action.input.parse(input));
};

/** Builds objects whose keys are SentinelOne filter names such as createdAt__gte. */
const vendorParams = (entries: Array<[string, unknown]>) => Object.fromEntries(entries);

const listBody = (data: unknown[] = [], nextCursor: string | null = null) => ({
  data,
  pagination: { nextCursor, totalItems: data.length },
});

const httpError = (status: number, data: unknown = {}, headers: Record<string, string> = {}) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, statusText: '', data, headers },
  });

beforeEach(() => {
  request.mockReset();
  jest.spyOn(timers, 'sleep').mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('SentinelOne (v2) spec', () => {
  it('is registered under .sentinelone2 with the agreed metadata', () => {
    expect(getConnectorSpec('.sentinelone2')).toBe(SentinelOne);
    expect(SentinelOne.metadata.displayName).toBe('SentinelOne (v2)');
    expect(SentinelOne.metadata.minimumLicense).toBe('enterprise');
    expect(SentinelOne.metadata.supportedFeatureIds).toContain('agentBuilder');
    expect(SentinelOne.test?.enabled).toBe(true);
  });

  it('declares the 57 actions of the TDD, each a tool with a scope and a description', () => {
    const names = Object.keys(SentinelOne.actions);
    // 57 TDD actions + getApplicationCves and runQuery, the additive replacements for deprecated routes
    expect(names).toHaveLength(59);
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
      expect(action.isTool).toBe(true);
      expect(action.scope).toBeDefined();
      expect(action.description?.length).toBeGreaterThan(40);
    }
  });

  it('marks the deprecated routes in their descriptions', () => {
    for (const name of [
      'createQuery',
      'getQueryStatus',
      'getQueryEvents',
      'getHashReputation',
      'getAgentCves',
    ]) {
      expect(SentinelOne.actions[name].description).toContain(
        'Deprecated in the official SentinelOne API specification'
      );
    }
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
const REQUEST_CASES: Array<
  [
    string,
    Record<string, unknown>,
    { method: string; path: string; params?: object; data?: unknown }
  ]
> = [
  [
    'getAgents',
    {
      computerName: 'host-1',
      ip: '10.0.0',
      ids: ['11', '12'],
      limit: 5,
      additionalFilters: { osTypes: ['windows'], isActive: true },
    },
    {
      method: 'GET',
      path: '/agents',
      params: vendorParams([
        ['computerName', 'host-1'],
        ['networkInterfaceInet__contains', '10.0.0'],
        ['ids', '11,12'],
        ['limit', 5],
        ['osTypes', 'windows'],
        ['isActive', true],
      ]),
    },
  ],
  [
    'initiateScan',
    { agentIds: ['11'] },
    { method: 'POST', path: '/agents/actions/initiate-scan', data: { filter: { ids: ['11'] } } },
  ],
  [
    'abortScan',
    { agentIds: ['11'] },
    { method: 'POST', path: '/agents/actions/abort-scan', data: { filter: { ids: ['11'] } } },
  ],
  [
    'shutdownAgent',
    { agentIds: ['11'] },
    { method: 'POST', path: '/agents/actions/shutdown', data: { filter: { ids: ['11'] } } },
  ],
  [
    'broadcastMessage',
    { agentIds: ['11'], message: 'Reboot at 5' },
    {
      method: 'POST',
      path: '/agents/actions/broadcast',
      data: { filter: { ids: ['11'] }, data: { message: 'Reboot at 5' } },
    },
  ],
  [
    'moveAgent',
    { groupId: '77', agentIds: ['11'] },
    { method: 'PUT', path: '/groups/77/move-agents', data: { filter: { ids: ['11'] } } },
  ],
  [
    'fetchAgentFiles',
    { agentId: '11', files: ['C:\\temp\\a.txt'], zipPassCode: 'Secret-Pass-123' },
    {
      method: 'POST',
      path: '/agents/11/actions/fetch-files',
      data: { data: { files: ['C:\\temp\\a.txt'], password: 'Secret-Pass-123' } },
    },
  ],
  [
    'fetchThreatFile',
    { threatId: '31', password: 'Secret-Pass-123' },
    {
      method: 'POST',
      path: '/threats/fetch-file',
      data: { data: { password: 'Secret-Pass-123' }, filter: { ids: ['31'] } },
    },
  ],
  [
    'getInstalledApplications',
    { agentIds: ['11', '12'] },
    { method: 'GET', path: '/agents/applications', params: { ids: '11,12' } },
  ],
  [
    'getActivities',
    { agentIds: ['11'], activityTypes: [81], createdAtGte: '2026-01-01T00:00:00Z', limit: 10 },
    {
      method: 'GET',
      path: '/activities',
      params: vendorParams([
        ['agentIds', '11'],
        ['activityTypes', '81'],
        ['createdAt__gte', '2026-01-01T00:00:00Z'],
        ['limit', 10],
      ]),
    },
  ],
  [
    'getThreats',
    {
      incidentStatuses: ['unresolved'],
      contentHashes: ['a'.repeat(40)],
      sortBy: 'createdAt',
      sortOrder: 'desc',
      cursor: 'c1',
    },
    {
      method: 'GET',
      path: '/threats',
      params: {
        incidentStatuses: 'unresolved',
        contentHashes: 'a'.repeat(40),
        sortBy: 'createdAt',
        sortOrder: 'desc',
        cursor: 'c1',
      },
    },
  ],
  [
    'getThreatDetails',
    { ids: ['31', '32'] },
    { method: 'GET', path: '/threats', params: { ids: '31,32', limit: 2 } },
  ],
  [
    'getThreatNotes',
    { threatId: '31', limit: 20 },
    { method: 'GET', path: '/threats/31/notes', params: { limit: 20 } },
  ],
  [
    'getThreatTimeline',
    { threatId: '31', query: 'kill' },
    { method: 'GET', path: '/threats/31/timeline', params: { query: 'kill' } },
  ],
  [
    'mitigateThreat',
    { action: 'quarantine', threatIds: ['31'] },
    { method: 'POST', path: '/threats/mitigate/quarantine', data: { filter: { ids: ['31'] } } },
  ],
  [
    'rollbackThreat',
    { threatIds: ['31'] },
    {
      method: 'POST',
      path: '/threats/mitigate/rollback-remediation',
      data: { filter: { ids: ['31'] } },
    },
  ],
  [
    'updateThreatVerdict',
    { threatIds: ['31'], analystVerdict: 'true_positive' },
    {
      method: 'POST',
      path: '/threats/analyst-verdict',
      data: { filter: { ids: ['31'] }, data: { analystVerdict: 'true_positive' } },
    },
  ],
  [
    'updateThreatStatus',
    { threatIds: ['31'], incidentStatus: 'resolved', analystVerdict: 'false_positive' },
    {
      method: 'POST',
      path: '/threats/incident',
      data: {
        filter: { ids: ['31'] },
        data: { incidentStatus: 'resolved', analystVerdict: 'false_positive' },
      },
    },
  ],
  [
    'addThreatNote',
    { threatIds: ['31'], text: 'Isolated after approval' },
    {
      method: 'POST',
      path: '/threats/notes',
      data: { filter: { ids: ['31'] }, data: { text: 'Isolated after approval' } },
    },
  ],
  [
    'getHashReputation',
    { hash: 'b'.repeat(40) },
    { method: 'GET', path: `/hashes/${'b'.repeat(40)}/verdict`, params: {} },
  ],
  [
    'getRemoteScripts',
    {
      osTypes: ['windows'],
      scriptType: ['action'],
      additionalFilters: vendorParams([['sortBy', 'scriptName']]),
    },
    {
      method: 'GET',
      path: '/remote-scripts',
      params: vendorParams([
        ['osTypes', 'windows'],
        ['scriptType', 'action'],
        ['sortBy', 'scriptName'],
      ]),
    },
  ],
  [
    'executeScript',
    {
      agentUuids: ['uuid-1'],
      scriptId: '91',
      taskDescription: 'Collect logs',
      scriptRuntimeTimeoutSeconds: 3600,
    },
    {
      method: 'POST',
      path: '/remote-scripts/execute',
      data: {
        filter: { uuids: ['uuid-1'] },
        data: {
          scriptId: '91',
          taskDescription: 'Collect logs',
          scriptRuntimeTimeoutSeconds: 3600,
          outputDestination: 'SentinelCloud',
        },
      },
    },
  ],
  [
    'getRemoteScriptStatus',
    { parentTaskId: '55', statuses: ['completed', 'failed'] },
    {
      method: 'GET',
      path: '/remote-scripts/status',
      params: { parentTaskId: '55', status: 'completed,failed' },
    },
  ],
  [
    'getRemoteScriptResults',
    { taskIds: ['61'], computerNames: ['host-1'] },
    {
      method: 'POST',
      path: '/remote-scripts/fetch-files',
      data: { data: { taskIds: ['61'], computerNames: ['host-1'] } },
    },
  ],
  [
    'searchAlerts',
    { severity: ['High'], incidentStatus: ['UNRESOLVED'] },
    {
      method: 'GET',
      path: '/cloud-detection/alerts',
      params: { severity: 'High', incidentStatus: 'UNRESOLVED' },
    },
  ],
  [
    'updateAlertVerdict',
    { alertIds: ['41'], analystVerdict: 'suspicious' },
    {
      method: 'POST',
      path: '/cloud-detection/alerts/analyst-verdict',
      data: { filter: { ids: ['41'] }, data: { analystVerdict: 'suspicious' } },
    },
  ],
  [
    'updateAlertStatus',
    { alertIds: ['41'], incidentStatus: 'in_progress' },
    {
      method: 'POST',
      path: '/cloud-detection/alerts/incident',
      data: { filter: { ids: ['41'] }, data: { incidentStatus: 'in_progress' } },
    },
  ],
  [
    'createQuery',
    {
      query: 'EventType = "Process Creation"',
      fromDate: '2026-01-01T00:00:00Z',
      toDate: '2026-01-02T00:00:00Z',
      queryType: 'events',
      siteIds: ['21'],
    },
    {
      method: 'POST',
      path: '/dv/init-query',
      data: {
        query: 'EventType = "Process Creation"',
        fromDate: '2026-01-01T00:00:00Z',
        toDate: '2026-01-02T00:00:00Z',
        siteIds: ['21'],
        queryType: ['events'],
      },
    },
  ],
  [
    'getQueryStatus',
    { queryId: 'q1' },
    { method: 'GET', path: '/dv/query-status', params: { queryId: 'q1' } },
  ],
  [
    'getQueryEvents',
    { queryId: 'q1', limit: 100, sortOrder: 'asc' },
    { method: 'GET', path: '/dv/events', params: { queryId: 'q1', limit: 100, sortOrder: 'asc' } },
  ],
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
  [
    'getAgentCves',
    { cveIds: ['CVE-2026-1'] },
    { method: 'GET', path: '/installed-applications/cves', params: { cveIds: 'CVE-2026-1' } },
  ],
  [
    'searchBlocklist',
    { value: 'c'.repeat(40), siteIds: ['21'] },
    {
      method: 'GET',
      path: '/restrictions',
      params: { value: 'c'.repeat(40), siteIds: '21', type: 'black_hash' },
    },
  ],
  [
    'addHashToBlocklist',
    { osType: 'windows', sha1: 'c'.repeat(40), description: 'Malware', siteIds: ['21'] },
    {
      method: 'POST',
      path: '/restrictions',
      data: {
        data: {
          osType: 'windows',
          description: 'Malware',
          type: 'black_hash',
          value: 'c'.repeat(40),
        },
        filter: { siteIds: ['21'] },
      },
    },
  ],
  [
    'removeHashFromBlocklist',
    { ids: ['81'] },
    {
      method: 'DELETE',
      path: '/restrictions',
      data: { data: { type: 'black_hash', ids: ['81'] } },
    },
  ],
  [
    'listExclusions',
    { type: 'path', osTypes: ['linux'] },
    { method: 'GET', path: '/exclusions', params: { type: 'path', osTypes: 'linux' } },
  ],
  [
    'createExclusion',
    { type: 'path', osType: 'linux', value: '/opt/app', mode: 'suppress', tenant: true },
    {
      method: 'POST',
      path: '/exclusions',
      data: {
        data: { type: 'path', osType: 'linux', value: '/opt/app', mode: 'suppress' },
        filter: { tenant: true },
      },
    },
  ],
  [
    'deleteExclusion',
    { ids: ['82'], type: 'path' },
    { method: 'DELETE', path: '/exclusions', data: { data: { ids: ['82'], type: 'path' } } },
  ],
  [
    'searchIOCs',
    { type: 'IPV4', accountIds: ['1'] },
    { method: 'GET', path: '/threat-intelligence/iocs', params: { type: 'IPV4', accountIds: '1' } },
  ],
  [
    'createIOC',
    { type: 'IPV4', value: '203.0.113.7', source: 'Elastic', accountIds: ['1'] },
    {
      method: 'POST',
      path: '/threat-intelligence/iocs',
      data: {
        data: [{ type: 'IPV4', value: '203.0.113.7', source: 'Elastic', method: 'EQUALS' }],
        filter: { accountIds: ['1'] },
      },
    },
  ],
  [
    'deleteIOC',
    { accountIds: ['1'], uuids: ['u-1'] },
    {
      method: 'DELETE',
      path: '/threat-intelligence/iocs',
      data: { filter: { accountIds: ['1'], uuids: ['u-1'] } },
    },
  ],
  [
    'listFirewallRules',
    { statuses: ['Enabled'] },
    { method: 'GET', path: '/firewall-control', params: { statuses: 'Enabled' } },
  ],
  [
    'createFirewallRule',
    {
      name: 'Block C2',
      action: 'Block',
      status: 'Enabled',
      osTypes: ['windows'],
      remoteHosts: [{ type: 'addresses', values: ['203.0.113.7'] }],
      groupIds: ['71'],
    },
    {
      method: 'POST',
      path: '/firewall-control',
      data: {
        data: {
          name: 'Block C2',
          action: 'Block',
          status: 'Enabled',
          osTypes: ['windows'],
          remoteHosts: [{ type: 'addresses', values: ['203.0.113.7'] }],
        },
        filter: { groupIds: ['71'] },
      },
    },
  ],
  [
    'deleteFirewallRule',
    { ids: ['91'] },
    { method: 'DELETE', path: '/firewall-control', data: { filter: { ids: ['91'] } } },
  ],
  [
    'createStarRule',
    {
      name: 'Encoded PowerShell',
      severity: 'High',
      queryType: 'events',
      s1ql: 'src.process.cmdline contains "-enc"',
      siteIds: ['21'],
    },
    {
      method: 'POST',
      path: '/cloud-detection/rules',
      data: {
        data: {
          name: 'Encoded PowerShell',
          severity: 'High',
          queryType: 'events',
          s1ql: 'src.process.cmdline contains "-enc"',
          status: 'Draft',
          expirationMode: 'Permanent',
        },
        filter: { siteIds: ['21'] },
      },
    },
  ],
  [
    'enableStarRules',
    { ruleIds: ['51'] },
    { method: 'PUT', path: '/cloud-detection/rules/enable', data: { filter: { ids: ['51'] } } },
  ],
  [
    'disableStarRules',
    { ruleIds: ['51'] },
    { method: 'PUT', path: '/cloud-detection/rules/disable', data: { filter: { ids: ['51'] } } },
  ],
  [
    'deleteStarRule',
    { ruleIds: ['51'] },
    { method: 'DELETE', path: '/cloud-detection/rules', data: { filter: { ids: ['51'] } } },
  ],
];

describe('request shapes', () => {
  it.each(REQUEST_CASES)('%s sends the documented request', async (name, input, expected) => {
    request.mockResolvedValue({ status: 200, data: { data: { affected: 1 } } });
    await run(name, input);
    expect(request).toHaveBeenCalledTimes(1);
    const sent = request.mock.calls[0][0];
    expect(sent.method).toBe(expected.method);
    expect(sent.url).toBe(`${API}${expected.path}`);
    expect(sent.headers).toEqual(AUTH);
    expect(sent.params).toEqual(expected.params ?? {});
    if (expected.data !== undefined) {
      expect(sent.data).toEqual(expected.data);
    } else {
      expect(sent.data).toBeUndefined();
    }
  });

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
  it('getQueryEvents redacts srcProcDownloadToken', async () => {
    request.mockResolvedValueOnce({
      status: 200,
      data: listBody([
        { id: 'e1', srcProcDownloadToken: 'dl-secret' },
        { id: 'e2', srcProcDownloadToken: '' },
      ]),
    });
    const result = await run('getQueryEvents', { queryId: 'q1' });
    expect(JSON.stringify(result)).not.toContain('dl-secret');
    expect(result).toEqual(
      expect.objectContaining({
        data: [
          { id: 'e1', srcProcDownloadToken: '[redacted]' },
          { id: 'e2', srcProcDownloadToken: '' },
        ],
      })
    );
  });

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
  ])(
    '[C-edge-empty-or-missing-ids-on-a-state-changing] %s rejects an empty id list at the schema boundary',
    (name, input) => {
      expect(() => SentinelOne.actions[name].input.parse(input)).toThrow();
    }
  );

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

  it('[C-edge-hash-already-on-the-blocklist] fails a write when SentinelOne reports per-item errors in HTTP 200', async () => {
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

  it('[C-edge-data-affected-0-or-per-item-errors-in-ht] fails a write when data.affected is 0', async () => {
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

  it('[C-edge-unknown-action-key-or-unknown-connector-] rejects unknown additionalFilters keys before the call', async () => {
    await expect(run('getAgents', { additionalFilters: { notAFilter: 'x' } })).rejects.toThrow(
      'unknown additionalFilters key(s) notAFilter'
    );
    expect(request).not.toHaveBeenCalled();
  });
});

describe('isolateHost and releaseHost', () => {
  it('[C-edge-asynchronous-actions-isolate-release-sca] reads the agents, skips those already isolated and isolates the rest', async () => {
    request
      .mockResolvedValueOnce({
        status: 200,
        data: listBody([
          { id: '11', networkStatus: 'connected' },
          { id: '12', networkStatus: 'disconnected' },
        ]),
      })
      .mockResolvedValueOnce({ status: 200, data: { data: { affected: 1 } } });
    const result = await run('isolateHost', { agentIds: ['11', '12', '13'] });
    expect(request.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        method: 'GET',
        url: `${API}/agents`,
        params: { ids: '11,12,13', limit: 3 },
      })
    );
    expect(request.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        method: 'POST',
        url: `${API}/agents/actions/disconnect`,
        data: { filter: { ids: ['11'] } },
      })
    );
    expect(result).toEqual({
      data: { affected: 1 },
      skipped: ['12'],
      notFound: ['13'],
      requested: 3,
    });
  });

  it("fails with '[C-edge-agent-ids-that-do-not-exist-isolate-or-r] No agents found' when none of the ids exist", async () => {
    request.mockResolvedValueOnce({ status: 200, data: listBody([]) });
    await expect(run('isolateHost', { agentIds: ['11'] })).rejects.toThrow('No agents found');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("fails with '[C-edge-isolate-or-release-an-agent-already-in-t] Agent already isolated' when every agent is disconnected", async () => {
    request.mockResolvedValueOnce({
      status: 200,
      data: listBody([{ id: '11', networkStatus: 'disconnected' }]),
    });
    await expect(run('isolateHost', { agentIds: ['11'] })).rejects.toThrow(
      'Agent already isolated'
    );
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("fails with 'Agent not isolated' when releasing connected agents", async () => {
    request.mockResolvedValueOnce({
      status: 200,
      data: listBody([{ id: '11', networkStatus: 'connected' }]),
    });
    await expect(run('releaseHost', { agentIds: ['11'] })).rejects.toThrow('Agent not isolated');
  });

  it('releases a disconnected agent through /agents/actions/connect', async () => {
    request
      .mockResolvedValueOnce({
        status: 200,
        data: listBody([{ id: '11', networkStatus: 'disconnected' }]),
      })
      .mockResolvedValueOnce({ status: 200, data: { data: { affected: 1 } } });
    await run('releaseHost', { agentIds: ['11'] });
    expect(request.mock.calls[1][0].url).toBe(`${API}/agents/actions/connect`);
  });

  it('does not retry the isolate call on 503 (state-changing)', async () => {
    request
      .mockResolvedValueOnce({
        status: 200,
        data: listBody([{ id: '11', networkStatus: 'connected' }]),
      })
      .mockRejectedValueOnce(httpError(503, { errors: [{ title: 'Unavailable' }] }));
    await expect(run('isolateHost', { agentIds: ['11'] })).rejects.toThrow('Status code: 503');
    expect(request).toHaveBeenCalledTimes(2);
  });
});

describe('updateStarRule', () => {
  it('[C-edge-star-rule-update] reads the rule, sends the full merged definition with its scope and returns the previous one', async () => {
    const current = {
      id: '51',
      name: 'Old',
      severity: 'Low',
      status: 'Active',
      queryType: 'events',
      s1ql: 'a',
      expirationMode: 'Permanent',
      coolOffSettings: { renotifyMinutes: 60 },
      scope: 'site',
      scopeId: ['21'],
      createdAt: '2026-01-01T00:00:00Z',
    };
    request
      .mockResolvedValueOnce({ status: 200, data: listBody([current]) })
      .mockResolvedValueOnce({ status: 200, data: { data: { id: '51', severity: 'High' } } });
    const result = await run('updateStarRule', { ruleId: '51', severity: 'High' });
    expect(request.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        method: 'GET',
        url: `${API}/cloud-detection/rules`,
        params: { ids: '51', limit: 1 },
      })
    );
    expect(request.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        method: 'PUT',
        url: `${API}/cloud-detection/rules/51`,
        data: {
          data: {
            name: 'Old',
            severity: 'High',
            status: 'Active',
            queryType: 'events',
            s1ql: 'a',
            expirationMode: 'Permanent',
            coolOffSettings: { renotifyMinutes: 60 },
          },
          filter: { siteIds: ['21'] },
        },
      })
    );
    expect(result).toEqual(expect.objectContaining({ previous: current }));
  });

  it('sends expirationMode Permanent when the stored rule has none', async () => {
    const current = {
      id: '51',
      name: 'Old',
      severity: 'Low',
      status: 'Active',
      queryType: 'events',
      s1ql: 'a',
      scope: 'site',
      scopeId: ['21'],
    };
    request
      .mockResolvedValueOnce({ status: 200, data: listBody([current]) })
      .mockResolvedValueOnce({ status: 200, data: { data: { id: '51' } } });
    await run('updateStarRule', { ruleId: '51', severity: 'High' });
    expect(request.mock.calls[1][0].data.data).toEqual(
      expect.objectContaining({ expirationMode: 'Permanent', severity: 'High' })
    );
  });

  it('needs at least one field to change', async () => {
    await expect(run('updateStarRule', { ruleId: '51' })).rejects.toThrow('at least one field');
    expect(request).not.toHaveBeenCalled();
  });

  it('fails when the rule does not exist', async () => {
    request.mockResolvedValueOnce({ status: 200, data: listBody([]) });
    await expect(run('updateStarRule', { ruleId: '51', name: 'New' })).rejects.toThrow(
      'STAR rule [51] not found'
    );
  });
});

describe('downloads', () => {
  const fileResponse = (body: string, headers: Record<string, string> = {}) => ({
    status: 200,
    data: new TextEncoder().encode(body).buffer,
    headers: { 'content-type': 'application/zip', ...headers },
  });

  it('downloadAgentFile returns base64 content, name, type and size from the console', async () => {
    request.mockResolvedValueOnce(
      fileResponse('PK-archive', { 'content-disposition': 'attachment; filename="files.zip"' })
    );
    await expect(run('downloadAgentFile', { agentId: '11', activityId: '99' })).resolves.toEqual({
      content: Buffer.from('PK-archive').toString('base64'),
      fileName: 'files.zip',
      contentType: 'application/zip',
      sizeBytes: 10,
    });
    expect(request.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        url: `${API}/agents/11/uploads/99`,
        headers: AUTH,
        responseType: 'arraybuffer',
        maxRedirects: 0,
        maxContentLength: 25 * 1024 * 1024,
      })
    );
  });

  it('[C-edge-download-links-script-results-threat-fil] downloadRemoteScriptResults fetches the link and sends no token to another host', async () => {
    request
      .mockResolvedValueOnce({
        status: 200,
        data: {
          data: {
            data: {
              downloadLinks: [
                {
                  taskId: '61',
                  fileName: 'out.zip',
                  downloadUrl: 'https://files.example.net/out.zip?sig=1',
                },
              ],
            },
          },
        },
      })
      .mockResolvedValueOnce(fileResponse('results'));
    const result = await run('downloadRemoteScriptResults', { taskId: '61' });
    expect(request.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        method: 'POST',
        url: `${API}/remote-scripts/fetch-files`,
        data: { data: { taskIds: ['61'] } },
      })
    );
    expect(request.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        url: 'https://files.example.net/out.zip?sig=1',
        headers: { Authorization: false, token: false },
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        fileName: 'out.zip',
        taskId: '61',
        sizeBytes: 7,
      })
    );
    // the signed link is used to fetch the file but is not handed back (workflow history would keep it)
    expect(result).not.toHaveProperty('downloadUrl');
  });

  it('[C-edge-no-download-link-returned] downloadRemoteScriptResults fails with the V1 message when there is no link', async () => {
    request.mockResolvedValueOnce({ status: 200, data: { data: { data: { downloadLinks: [] } } } });
    await expect(run('downloadRemoteScriptResults', { taskId: '61' })).rejects.toThrow(
      'Download URL for script results of task id [61] not found'
    );
  });

  it('downloadThreatFile sends the token to a console link but strips it on a cross-host redirect', async () => {
    request
      .mockResolvedValueOnce({
        status: 200,
        data: { data: { downloadUrl: `${CONSOLE}/web/api/v2.1/threats/31/file` } },
      })
      .mockResolvedValueOnce({
        status: 302,
        data: new ArrayBuffer(0),
        headers: { location: 'https://cdn.example.net/blob' },
      })
      .mockResolvedValueOnce(fileResponse('threat'));
    const result = await run('downloadThreatFile', { threatId: '31' });
    expect(request.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        url: `${CONSOLE}/web/api/v2.1/threats/31/file`,
        headers: AUTH,
        maxRedirects: 0,
      })
    );
    expect(request.mock.calls[2][0]).toEqual(
      expect.objectContaining({
        url: 'https://cdn.example.net/blob',
        headers: { Authorization: false, token: false },
      })
    );
    expect(result).toEqual(expect.objectContaining({ threatId: '31', sizeBytes: 6 }));
    expect(result).not.toHaveProperty('downloadUrl');
  });

  it('downloadThreatFile fails clearly when SentinelOne returns no link', async () => {
    request.mockResolvedValueOnce({ status: 200, data: { data: {} } });
    await expect(run('downloadThreatFile', { threatId: '31' })).rejects.toThrow(
      'No file download link for threat [31]'
    );
  });

  it('[C-edge-file-download-over-25-mb] fails instead of truncating a file over 25 MB', async () => {
    request.mockRejectedValueOnce(
      Object.assign(new Error('maxContentLength size of 26214400 exceeded'), {
        isAxiosError: true,
        code: 'ERR_BAD_RESPONSE',
      })
    );
    await expect(run('downloadAgentFile', { agentId: '11', activityId: '99' })).rejects.toThrow(
      'File larger than 25 MB; download it from the SentinelOne console'
    );
  });
});

describe('runScriptAndWait', () => {
  const script = { agentIds: ['11'], scriptId: '91', taskDescription: 'Collect', waitSeconds: 10 };

  it('polls the status until every task is final, then returns the links', async () => {
    request
      .mockResolvedValueOnce({ status: 200, data: { data: { affected: 1, parentTaskId: '55' } } })
      .mockResolvedValueOnce({ status: 200, data: listBody([{ id: '61', status: 'in_progress' }]) })
      .mockResolvedValueOnce({ status: 200, data: listBody([{ id: '61', status: 'completed' }]) })
      .mockResolvedValueOnce({
        status: 200,
        data: { data: { data: { downloadLinks: [{ taskId: '61', downloadUrl: 'https://x/1' }] } } },
      });
    await expect(run('runScriptAndWait', script)).resolves.toEqual({
      parentTaskId: '55',
      pending: false,
      pendingExecutionId: null,
      timedOut: false,
      tasks: [{ id: '61', status: 'completed' }],
      downloadLinks: [{ taskId: '61', downloadUrl: 'https://x/1' }],
    });
    expect(request.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        url: `${API}/remote-scripts/status`,
        params: { parentTaskId: '55', limit: 1000 },
      })
    );
    expect(timers.sleep).toHaveBeenCalledWith(5000);
  });

  it('returns timedOut with the parentTaskId when tasks are still running', async () => {
    request
      .mockResolvedValueOnce({ status: 200, data: { data: { affected: 1, parentTaskId: '55' } } })
      .mockResolvedValue({ status: 200, data: listBody([{ id: '61', status: 'in_progress' }]) });
    const result = await run('runScriptAndWait', script);
    expect(result).toEqual(expect.objectContaining({ parentTaskId: '55', timedOut: true }));
    expect(request).toHaveBeenCalledTimes(3);
  });

  describe('with a simulated clock', () => {
    let now: number;
    beforeEach(() => {
      now = 0;
      jest.spyOn(Date, 'now').mockImplementation(() => now);
      jest.spyOn(timers, 'sleep').mockImplementation(async (ms: number) => {
        now += ms;
      });
    });
    const launched = { status: 200, data: { data: { affected: 1, parentTaskId: '55' } } };
    const slowStatus = () => {
      now += 1000; // each status request takes 1 s
      return Promise.resolve({
        status: 200,
        data: listBody([{ id: '61', status: 'in_progress' }]),
      });
    };

    it('bounds the wait by elapsed time, including the time of the status requests', async () => {
      request.mockResolvedValueOnce(launched).mockImplementation(slowStatus);
      const result = await run('runScriptAndWait', { ...script, waitSeconds: 10 });
      expect(result).toEqual(expect.objectContaining({ parentTaskId: '55', timedOut: true }));
      expect((timers.sleep as jest.Mock).mock.calls).toEqual([[5000], [4000]]);
      expect(now).toBe(10_000);
      // the status request gets the remaining budget as its timeout
      expect(request.mock.calls[1][0]).toEqual(expect.objectContaining({ timeout: 5000 }));
    });

    it('returns timedOut, not an error, when a status request is cut by the remaining budget', async () => {
      request.mockResolvedValueOnce(launched).mockImplementation((config: { timeout: number }) => {
        if (config.timeout < 60_000) {
          now += config.timeout;
          return Promise.reject(
            Object.assign(new Error('timeout exceeded'), {
              isAxiosError: true,
              code: 'ECONNABORTED',
            })
          );
        }
        return slowStatus();
      });
      const result = await run('runScriptAndWait', { ...script, waitSeconds: 12 });
      expect(result).toEqual(expect.objectContaining({ parentTaskId: '55', timedOut: true }));
    });

    it('still fails on a status request error that is not caused by the budget', async () => {
      request
        .mockResolvedValueOnce(launched)
        .mockRejectedValueOnce(
          httpError(401, { errors: [{ code: 4010010, title: 'Unauthorized' }] })
        );
      await expect(run('runScriptAndWait', { ...script, waitSeconds: 12 })).rejects.toThrow(
        'Status code: 401'
      );
    });

    it('waits 100 seconds by default', async () => {
      request.mockResolvedValueOnce(launched).mockImplementation(slowStatus);
      const { agentIds, scriptId, taskDescription } = script;
      const result = await run('runScriptAndWait', { agentIds, scriptId, taskDescription });
      expect(result).toEqual(expect.objectContaining({ timedOut: true }));
      expect(now).toBe(100_000);
    });
  });

  it('reads every status page before deciding that the run is finished', async () => {
    request
      .mockResolvedValueOnce({ status: 200, data: { data: { affected: 2, parentTaskId: '55' } } })
      .mockResolvedValueOnce({
        status: 200,
        data: listBody([{ id: '61', status: 'completed' }], 'c2'),
      })
      .mockResolvedValueOnce({ status: 200, data: listBody([{ id: '62', status: 'in_progress' }]) })
      .mockResolvedValueOnce({
        status: 200,
        data: listBody([{ id: '61', status: 'completed' }], 'c2'),
      })
      .mockResolvedValueOnce({ status: 200, data: listBody([{ id: '62', status: 'completed' }]) })
      .mockResolvedValueOnce({ status: 200, data: { data: { data: { downloadLinks: [] } } } });
    const result = await run('runScriptAndWait', { ...script, waitSeconds: 30 });
    expect(result).toEqual(
      expect.objectContaining({
        timedOut: false,
        tasks: [
          { id: '61', status: 'completed' },
          { id: '62', status: 'completed' },
        ],
      })
    );
    expect(request.mock.calls[2][0]).toEqual(
      expect.objectContaining({ params: { parentTaskId: '55', limit: 1000, cursor: 'c2' } })
    );
    expect(request).toHaveBeenCalledTimes(6);
  });

  it('stops reading status pages when the cursor does not move, without duplicate tasks', async () => {
    request
      .mockResolvedValueOnce({ status: 200, data: { data: { affected: 1, parentTaskId: '55' } } })
      .mockResolvedValueOnce({
        status: 200,
        data: listBody([{ id: '61', status: 'completed' }], 'same'),
      })
      .mockResolvedValueOnce({
        status: 200,
        data: listBody([{ id: '61', status: 'completed' }], 'same'),
      })
      .mockResolvedValueOnce({ status: 200, data: { data: { data: { downloadLinks: [] } } } });
    const result = await run('runScriptAndWait', { ...script, waitSeconds: 30 });
    expect(result).toEqual(
      expect.objectContaining({ timedOut: false, tasks: [{ id: '61', status: 'completed' }] })
    );
    expect(request).toHaveBeenCalledTimes(4);
  });

  it('[C-edge-pending-remote-script-execution-requires] does not poll a pending execution that needs approval', async () => {
    request.mockResolvedValueOnce({
      status: 200,
      data: { data: { affected: 1, parentTaskId: null, pending: true, pendingExecutionId: 'p1' } },
    });
    await expect(run('runScriptAndWait', script)).resolves.toEqual(
      expect.objectContaining({ pending: true, pendingExecutionId: 'p1', parentTaskId: null })
    );
    expect(request).toHaveBeenCalledTimes(1);
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
    ['getHashReputation', { hash: 'not-a-sha1' }],
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

/**
 * V1 parity: every test of the V1 stack connector (x-pack stack_connectors sentinelone.test.ts) carried to V2.
 * Same input, same expected result, in V2's action names and schemas. The one documented change (G1) is the credential
 * placement: V1 sent it as the APIToken query parameter, V2 sends Authorization: ApiToken <token> (AUTH below).
 */
describe('Deep Visibility polling', () => {
  it('[C-edge-deep-visibility-status-polling] getQueryStatus makes one request per call and never polls inside the action', async () => {
    request.mockResolvedValue({ status: 200, data: { data: { responseState: 'RUNNING' } } });
    await run('getQueryStatus', { queryId: 'q1' });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0].url).toBe(`${API}/dv/query-status`);
    expect(request.mock.calls[0][0].params).toEqual({ queryId: 'q1' });
  });
});

describe('V1 parity', () => {
  const parses = (name: string, input: unknown) => SentinelOne.actions[name].input.parse(input);
  const NEW_AGENT = '225494730938493804';
  const fileOk = () => ({ status: 200, data: { data: { success: true }, errors: null } });

  it('[C-v1-536] fetchAgentFiles errors if no agent id is provided', async () => {
    await expect(async () =>
      run('fetchAgentFiles', { agentId: '', files: ['/tmp/one'], zipPassCode: 'passwordMin10' })
    ).rejects.toThrow(/agentId/);
  });

  it('[C-v1-537] fetchAgentFiles calls the fetch-files API with the expected data', async () => {
    request.mockResolvedValue(fileOk());
    const response = await run('fetchAgentFiles', {
      agentId: NEW_AGENT,
      files: ['/tmp/one'],
      zipPassCode: 'foo-password-1',
    });
    expect(response).toEqual(expect.objectContaining({ data: { success: true } }));
    expect(request).toHaveBeenLastCalledWith(
      expect.objectContaining({
        url: `${API}/agents/${NEW_AGENT}/actions/fetch-files`,
        method: 'POST',
        data: { data: { password: 'foo-password-1', files: ['/tmp/one'] } },
        headers: AUTH,
      })
    );
  });

  it('[C-v1-538] downloadAgentFile errors if called with an invalid agent id', async () => {
    await expect(async () =>
      run('downloadAgentFile', { agentId: '', activityId: '5' })
    ).rejects.toThrow(/agentId/);
  });

  it('[C-v1-539] downloadAgentFile calls the API with the expected url and returns the file', async () => {
    request.mockResolvedValue({
      status: 200,
      data: new TextEncoder().encode('file-body').buffer,
      headers: { 'content-type': 'application/zip' },
    });
    const result = await run('downloadAgentFile', { agentId: NEW_AGENT, activityId: '77' });
    expect(request.mock.calls[0][0].url).toBe(`${API}/agents/${NEW_AGENT}/uploads/77`);
    expect(result).toEqual(expect.objectContaining({ sizeBytes: 9 }));
  });

  it('[C-v1-540] getActivities calls the activities API with no query params', async () => {
    request.mockResolvedValue({ status: 200, data: listBody() });
    await run('getActivities', {});
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: `${API}/activities`,
        params: {},
        headers: AUTH,
      })
    );
  });

  it('[C-v1-541] getActivities calls the activities API with the provided query params', async () => {
    request.mockResolvedValue({ status: 200, data: listBody() });
    await run('getActivities', { ids: 'one, two', limit: 20, cursor: 'at-position-1' } as never);
    expect(request.mock.calls[0][0].params).toEqual({
      ids: 'one, two',
      limit: 20,
      cursor: 'at-position-1',
    });
  });

  it('[C-v1-542] downloadRemoteScriptResults calls the API to retrieve the task results', async () => {
    request.mockResolvedValueOnce({
      status: 200,
      data: { data: { data: { downloadLinks: [] } } },
    });
    await run('downloadRemoteScriptResults', { taskId: 'task-123' }).catch(() => undefined);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${API}/remote-scripts/fetch-files`,
        data: { data: { taskIds: ['task-123'] } },
      })
    );
  });

  it('[C-v1-543] downloadRemoteScriptResults errors if the task has no download url', async () => {
    request.mockResolvedValueOnce({ status: 200, data: { data: { data: { downloadLinks: [] } } } });
    await expect(run('downloadRemoteScriptResults', { taskId: 'task-123' })).rejects.toThrow(
      'Download URL for script results of task id [task-123] not found'
    );
  });

  it('[C-v1-544] downloadRemoteScriptResults returns the file behind the link', async () => {
    request
      .mockResolvedValueOnce({
        status: 200,
        data: {
          data: {
            data: {
              downloadLinks: [
                { taskId: 'task-123', fileName: 'r.zip', downloadUrl: `${CONSOLE}/f/r.zip` },
              ],
            },
          },
        },
      })
      .mockResolvedValueOnce({
        status: 200,
        data: new TextEncoder().encode('results').buffer,
        headers: {},
      });
    await expect(run('downloadRemoteScriptResults', { taskId: 'task-123' })).resolves.toEqual(
      expect.objectContaining({ fileName: 'r.zip', taskId: 'task-123', sizeBytes: 7 })
    );
  });

  it('[C-v1-545] getRemoteScripts passes the query parameters to the API', async () => {
    request.mockResolvedValue({ status: 200, data: listBody() });
    await run('getRemoteScripts', {
      osTypes: ['windows'],
      limit: 123,
      cursor: 'at-position-1',
      groupIds: ['abc'],
      ids: ['987'],
      isAvailableForArs: true,
      query: 'match something',
      scriptType: ['action'],
      siteIds: ['site-aaa'],
      additionalFilters: { sortBy: 'scriptName', skip: 10, skipCount: true, sortOrder: 'asc' },
    } as never).catch((e) => {
      throw e;
    });
    const sent = request.mock.calls[0][0];
    expect(sent.url).toBe(`${API}/remote-scripts`);
    expect(sent.params).toEqual(
      expect.objectContaining({
        osTypes: 'windows',
        limit: 123,
        cursor: 'at-position-1',
        groupIds: 'abc',
        ids: '987',
        isAvailableForArs: true,
        query: 'match something',
        scriptType: 'action',
        siteIds: 'site-aaa',
        sortBy: 'scriptName',
        skip: 10,
        skipCount: true,
        sortOrder: 'asc',
      })
    );
  });

  // V1 config and secrets schemas
  const configSchema = () => SentinelOne.schema as unknown as { parse: (v: unknown) => unknown };
  it('[C-v1-590] a valid config is accepted', () => {
    expect(() => configSchema().parse({ url: 'https://api.sentinelone.com' })).not.toThrow();
  });
  it('[C-v1-591] a config without the url is rejected', () => {
    expect(() => configSchema().parse({})).toThrow();
  });
  it('[C-v1-592] a config with unknown properties is rejected', () => {
    expect(() =>
      configSchema().parse({ url: 'https://api.sentinelone.com', unknownProp: 'value' })
    ).toThrow();
  });
  it('[C-v1-593] valid secrets are accepted', () => {
    const t = SentinelOne.auth?.types?.[0] as { type: string; defaults?: { headerField?: string } };
    expect(t.type).toBe('api_key_header');
    expect(t.defaults?.headerField).toBe('token');
  });
  it('[C-v1-594] secrets without the token are rejected before any request', async () => {
    const test = SentinelOne.test as unknown as {
      handler: (c: ActionContext) => Promise<{ ok: boolean }>;
    };
    await expect(test.handler({ ...ctx, secrets: {} } as unknown as ActionContext)).rejects.toThrow(
      'SentinelOne connector is missing the API token.'
    );
    expect(request).not.toHaveBeenCalled();
  });
  // Intended change: V1 rejected unknown secret properties; the V2 secrets schema comes from the shared
  // api_key_header auth type, which requires the token and drops unknown properties instead.
  it('[C-v1-595] the secrets schema requires a non-empty token and drops unknown properties', () => {
    const secretsSchema = ApiKeyHeaderAuth.normalizeSchema?.({ headerField: 'token' }) as {
      parse: (v: unknown) => unknown;
    };
    expect(() => secretsSchema.parse({})).toThrow();
    expect(() => secretsSchema.parse({ token: '' })).toThrow();
    expect(secretsSchema.parse({ token: 'x', unknownProp: 'value' })).toEqual({ token: 'x' });
  });

  it('[C-v1-596] getRemoteScripts validates an empty object', () => {
    expect(() => parses('getRemoteScripts', {})).not.toThrow();
  });
  it('[C-v1-597] getRemoteScripts validates with filters', () => {
    expect(() =>
      parses('getRemoteScripts', {
        query: 'script-name',
        osTypes: ['windows', 'linux'],
        scriptType: ['action'],
        limit: 50,
      })
    ).not.toThrow();
  });
  // Intended change: V1 defaulted limit to null and axios dropped it, so neither V1 nor V2 sends a limit
  // when none is given (SentinelOne applies its default of 10); V2 leaves it undefined instead of null.
  it('[C-v1-598] getRemoteScripts has no default limit (V1 returned null, V2 leaves it unset)', () => {
    expect(parses('getRemoteScripts', {}).limit).toBeUndefined();
  });
  it('[C-v1-599] getRemoteScripts validates the limit range', () => {
    expect(() => parses('getRemoteScripts', { limit: 1 })).not.toThrow();
    expect(() => parses('getRemoteScripts', { limit: 1000 })).not.toThrow();
  });
  it('[C-v1-600] getRemoteScripts throws on a limit above the maximum', () => {
    expect(() => parses('getRemoteScripts', { limit: 1001 })).toThrow();
  });
  it('[C-v1-601] getRemoteScripts throws on a limit below the minimum', () => {
    expect(() => parses('getRemoteScripts', { limit: 0 })).toThrow();
  });
  it('[C-v1-602] getRemoteScripts coerces the limit to a number', () => {
    expect(parses('getRemoteScripts', { limit: '50' }).limit).toBe(50);
  });

  const fetchOk = {
    agentId: 'agent-123',
    zipPassCode: 'passwordMin10',
    files: ['/path/to/file.txt'],
  };
  it('[C-v1-603] fetchAgentFiles validates with the required fields', () => {
    expect(() => parses('fetchAgentFiles', fetchOk)).not.toThrow();
  });
  it('[C-v1-604] fetchAgentFiles throws when the agentId is missing', () => {
    expect(() => parses('fetchAgentFiles', { ...fetchOk, agentId: undefined })).toThrow();
  });
  it('[C-v1-605] fetchAgentFiles throws on an empty agentId', () => {
    expect(() => parses('fetchAgentFiles', { ...fetchOk, agentId: '' })).toThrow();
  });
  it('[C-v1-606] fetchAgentFiles throws when the zipPassCode is too short', () => {
    expect(() => parses('fetchAgentFiles', { ...fetchOk, zipPassCode: 'short' })).toThrow();
  });
  it('[C-v1-607] fetchAgentFiles throws when the files array contains an empty string', () => {
    expect(() => parses('fetchAgentFiles', { ...fetchOk, files: [''] })).toThrow();
  });
  it('[C-v1-608] downloadAgentFile validates with the required fields', () => {
    expect(() =>
      parses('downloadAgentFile', { agentId: 'agent-123', activityId: 'activity-456' })
    ).not.toThrow();
  });
  it('[C-v1-609] downloadAgentFile throws on an empty agentId', () => {
    expect(() =>
      parses('downloadAgentFile', { agentId: '', activityId: 'activity-456' })
    ).toThrow();
  });
  it('[C-v1-610] downloadAgentFile throws on an empty activityId', () => {
    expect(() => parses('downloadAgentFile', { agentId: 'agent-123', activityId: '' })).toThrow();
  });

  it('[C-v1-611] getActivities validates an empty object', () => {
    expect(() => parses('getActivities', {})).not.toThrow();
  });
  it('[C-v1-612] getActivities validates undefined', () => {
    expect(() => parses('getActivities', undefined)).not.toThrow();
  });
  it('[C-v1-613] getActivities validates with filters', () => {
    expect(() =>
      parses('getActivities', {
        accountIds: ['account-123'],
        activityTypes: [1, 2, 3],
        agentIds: ['agent-123', 'agent-456'],
        limit: 100,
      })
    ).not.toThrow();
  });
  it('[C-v1-614] getActivities coerces the limit to a number', () => {
    expect(parses('getActivities', { limit: '50' })?.limit).toBe(50);
  });

  it('[C-v1-615] executeScript validates with the required fields', () => {
    expect(() =>
      parses('executeScript', {
        agentIds: [NEW_AGENT],
        scriptId: '1164327801004752901',
        taskDescription: 'soar-test',
      })
    ).not.toThrow();
  });
  it('[C-v1-616] executeScript validates with all script options', () => {
    expect(() =>
      parses('executeScript', {
        agentUuids: ['3f6c1d2e-8b7a-4e5f-9a10-0b1c2d3e4f50'],
        scriptId: '1164327801004752901',
        taskDescription: 'soar-test',
        apiKey: 'api-key',
        inputParams: '-Verbose',
        outputDirectory: '/output',
        outputDestination: 'SentinelCloud',
        scriptRuntimeTimeoutSeconds: 300,
      })
    ).not.toThrow();
  });
  it('[C-v1-617] executeScript validates the outputDestination enum values', () => {
    for (const dest of ['Local', 'None', 'SentinelCloud', 'SingularityXDR']) {
      expect(() =>
        parses('executeScript', {
          agentIds: [NEW_AGENT],
          scriptId: '1164327801004752901',
          taskDescription: 'soar-test',
          outputDestination: dest,
        })
      ).not.toThrow();
    }
  });
  it('[C-v1-618] executeScript throws on an invalid outputDestination', () => {
    expect(() =>
      parses('executeScript', {
        agentIds: [NEW_AGENT],
        scriptId: '1164327801004752901',
        taskDescription: 'soar-test',
        outputDestination: 'Invalid',
      })
    ).toThrow();
  });
  it('[C-v1-619] executeScript coerces scriptRuntimeTimeoutSeconds to a number', () => {
    expect(
      parses('executeScript', {
        agentIds: [NEW_AGENT],
        scriptId: '1164327801004752901',
        taskDescription: 'soar-test',
        scriptRuntimeTimeoutSeconds: '300',
      }).scriptRuntimeTimeoutSeconds
    ).toBe(300);
  });

  it('[C-v1-620] getRemoteScriptResults validates with taskIds', () => {
    expect(() => parses('getRemoteScriptResults', { taskIds: ['task-1', 'task-2'] })).not.toThrow();
  });
  it('[C-v1-621] getRemoteScriptResults throws when taskIds is missing', () => {
    expect(() => parses('getRemoteScriptResults', {})).toThrow();
  });
  it('[C-v1-622] downloadRemoteScriptResults validates with a taskId', () => {
    expect(() => parses('downloadRemoteScriptResults', { taskId: 'task-123' })).not.toThrow();
  });
  it('[C-v1-623] downloadRemoteScriptResults throws on an empty taskId', () => {
    expect(() => parses('downloadRemoteScriptResults', { taskId: '' })).toThrow();
  });
  it('[C-v1-624] getRemoteScriptStatus validates with a parentTaskId', () => {
    expect(() =>
      parses('getRemoteScriptStatus', { parentTaskId: 'parent-task-123' })
    ).not.toThrow();
  });
  it('[C-v1-625] getRemoteScriptStatus throws when the parentTaskId is missing', () => {
    expect(() => parses('getRemoteScriptStatus', {})).toThrow();
  });

  // Intended change R-099 (G1 decision): V1 accepted {} or host filters and acted on the first match; V2 requires
  // explicit agentIds, because SentinelOne applies an empty or broad filter to every matching agent.
  it('[C-v1-626] isolateHost rejects an empty object (V1 accepted it; V2 requires agentIds, R-099)', () => {
    expect(() => parses('isolateHost', {})).toThrow();
  });
  it('[C-v1-627] isolateHost rejects V1 host filters without agentIds (R-099)', () => {
    expect(() =>
      parses('isolateHost', { ids: 'agent-123', siteIds: 'site-456', groupIds: 'group-789' })
    ).toThrow();
    expect(() => parses('isolateHost', { agentIds: ['agent-123'] })).not.toThrow();
  });
  it('[C-v1-628] the isolateHost action is declared', () => {
    expect(SentinelOne.actions.isolateHost).toBeDefined();
  });
  it('[C-v1-629] the releaseHost action is declared', () => {
    expect(SentinelOne.actions.releaseHost).toBeDefined();
  });
  it('[C-v1-630] the executeScript action is declared', () => {
    expect(SentinelOne.actions.executeScript).toBeDefined();
  });
  it('[C-v1-631] an unknown action is not declared', () => {
    expect(SentinelOne.actions.invalidAction).toBeUndefined();
  });

  it('[C-v1-716] every call carries the credential and no body or response cap is lowered', async () => {
    request.mockResolvedValue({ status: 200, data: listBody() });
    await run('getAgents', {});
    const sent = request.mock.calls[0][0];
    expect(sent.headers).toEqual(AUTH);
    expect(sent.params).toEqual({});
  });
  it("[C-v1-717] getActivities passes ids 'one, two' (comma then space) unchanged", async () => {
    request.mockResolvedValue({ status: 200, data: listBody() });
    await run('getActivities', { ids: 'one, two' } as never);
    expect(request.mock.calls[0][0].params.ids).toBe('one, two');
  });
});

describe('fetchThreatFile', () => {
  const fetchOne = () => run('fetchThreatFile', { threatId: '31', password: 'Secret-Pass-123' });

  it('sends the single threat and the password in the body only and never returns the password', async () => {
    request.mockResolvedValueOnce({ status: 200, data: { data: { affected: 1 } } });
    const result = await fetchOne();
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        method: 'POST',
        url: `${CONSOLE}/web/api/v2.1/threats/fetch-file`,
        data: { data: { password: 'Secret-Pass-123' }, filter: { ids: ['31'] } },
      })
    );
    expect(JSON.stringify(result)).not.toContain('Secret-Pass-123');
  });

  it('fails when SentinelOne reports that no threat was affected', async () => {
    request.mockResolvedValueOnce({ status: 200, data: { data: { affected: 0 } } });
    await expect(fetchOne()).rejects.toThrow(
      'SentinelOne did not apply fetchThreatFile to 31: SentinelOne reported 0 affected objects'
    );
  });

  it('does not put the password in the error of a rejected request', async () => {
    request.mockRejectedValueOnce(
      httpError(400, { errors: [{ code: 4000010, title: 'Invalid user input received' }] })
    );
    const error = await fetchOne().catch((e: Error) => e);
    expect(error).toBeInstanceOf(Error);
    expect(String((error as Error).message)).not.toContain('Secret-Pass-123');
  });
});

describe('moveAgent response shapes (the live tenant answer first, the documented one as a fallback)', () => {
  const move = () => run('moveAgent', { groupId: '77', agentIds: ['11'] });

  it('succeeds when SentinelOne reports the agents it moved (live: HTTP 200 with data.agentsMoved)', async () => {
    request.mockResolvedValueOnce({ status: 200, data: { data: { agentsMoved: 1 } } });
    await expect(move()).resolves.toEqual({ data: { agentsMoved: 1 } });
  });

  it('fails clearly when SentinelOne moved 0 agents (live: the agent is already in that group)', async () => {
    request.mockResolvedValueOnce({ status: 200, data: { data: { agentsMoved: 0 } } });
    await expect(move()).rejects.toThrow(
      'SentinelOne did not apply moveAgent to 11: SentinelOne moved 0 agents'
    );
  });

  it('accepts the 204 response with no body that the API reference documents', async () => {
    request.mockResolvedValueOnce({ status: 204, data: '' });
    await expect(move()).resolves.toBeDefined();
  });
});
