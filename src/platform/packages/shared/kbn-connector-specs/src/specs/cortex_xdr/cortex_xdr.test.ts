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
import { timing } from './client';
import { CortexXdr } from './cortex_xdr';

const API_URL = 'https://api-tenant.xdr.us.paloaltonetworks.com';
const BASE = `${API_URL}/public_api/v1`;
const EP = 'aeec6a2cc92e46fab3b6f621722e9916';

const ok = (data: unknown, status = 200) => ({ status, data, headers: {} });
const httpError = (status: number, data: unknown = {}) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data, headers: {} },
  });

const createContext = () => {
  const request = jest.fn();
  const ctx = {
    client: { request },
    config: { apiUrl: API_URL },
    log: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;
  return { ctx, request };
};

const runAction = (ctx: ActionContext, name: string, input: unknown) => {
  const action = CortexXdr.actions[name];
  return action.handler(ctx, action.input.parse(input));
};

/** The request_data of each call, in order. */
const sent = (request: jest.Mock) =>
  request.mock.calls.map(([config]) => ({
    url: config.url,
    method: config.method,
    body: config.data?.request_data,
  }));

describe('Cortex XDR connector', () => {
  beforeEach(() => jest.spyOn(timing, 'sleep').mockResolvedValue());
  afterEach(() => jest.restoreAllMocks());

  describe('definition', () => {
    it('is registered under .cortex_xdr for Agent Builder only', () => {
      expect(getConnectorSpec('.cortex_xdr')).toBe(CortexXdr);
      expect(CortexXdr.metadata.supportedFeatureIds).toEqual(['agentBuilder']);
      expect(CortexXdr.metadata.minimumLicense).toBe('enterprise');
      expect(CortexXdr.test?.enabled).toBe(true);
      expect(CortexXdr.events).toBeUndefined();
    });

    it('signs requests with the Advanced API key auth type', () => {
      expect((CortexXdr.auth?.types as Array<{ type: string }>).map(({ type }) => type)).toEqual([
        'cortex_xdr_advanced_key',
      ]);
    });

    it('has the 31 agreed actions, each described with a scope; risky ones are not tools', () => {
      expect(Object.keys(CortexXdr.actions).sort()).toEqual(
        [
          'getEndpoints',
          'isolateEndpoint',
          'unisolateEndpoint',
          'getActionStatus',
          'scanEndpoint',
          'cancelScan',
          'quarantineFile',
          'restoreFile',
          'getQuarantineStatus',
          'blocklistFiles',
          'allowlistFiles',
          'getScripts',
          'runScript',
          'getScriptResults',
          'getCases',
          'getCaseDetails',
          'getIssues',
          'updateCase',
          'updateIssue',
          'runXqlQuery',
          'getXqlResults',
          'addEndpointTag',
          'removeEndpointTag',
          'retrieveFile',
          'getRetrievedFileDetails',
          'insertIndicators',
          'getIndicators',
          'getPolicy',
          'getDeviceControlViolations',
          'getAuditLogs',
          'getRiskyUsers',
        ].sort()
      );
      const notTools = [
        'allowlistFiles',
        'isolateEndpoint',
        'quarantineFile',
        'runScript',
        'unisolateEndpoint',
      ];
      for (const [name, action] of Object.entries(CortexXdr.actions)) {
        expect(action.isTool).toBe(!notTools.includes(name));
        expect(['read', 'write', 'destroy']).toContain(action.scope);
        expect(action.description?.length).toBeGreaterThan(60);
      }
    });

    it('names only existing actions in the skill text', () => {
      const named = [...(CortexXdr.skill ?? '').matchAll(/`([a-z][A-Za-z]+)`/g)].map(([, n]) => n);
      const actionLike = named.filter((name) =>
        /^(get|run|update|isolate|unisolate|scan|cancel|quarantine|restore|blocklist|allowlist|add|remove|retrieve|insert)[A-Z]/.test(
          name
        )
      );
      expect(actionLike.length).toBeGreaterThan(10);
      for (const name of actionLike) {
        expect(CortexXdr.actions).toHaveProperty(name);
      }
    });

    it.each([
      [API_URL, true],
      [`${API_URL}/`, true],
      [`${API_URL}/public_api/v1`, true],
      ['http://api-tenant.xdr.us.paloaltonetworks.com', false],
      ['http://localhost:18080', true],
      ['http://127.0.0.1:18080', true],
      ['http://localhost.example.com', false],
      [`${API_URL}/other`, false],
      [`${API_URL}/?x=1`, false],
      ['https://user:pass@api-tenant.xdr.us.paloaltonetworks.com', false],
    ])('config apiUrl %s valid: %s', (apiUrl, valid) => {
      expect(CortexXdr.schema?.safeParse({ apiUrl }).success).toBe(valid);
    });
  });

  describe('test connection', () => {
    it('reads one case and reports the total', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(ok({ reply: { TOTAL_COUNT: 12, FILTER_COUNT: 12, DATA: [] } }));
      await expect(CortexXdr.test?.handler(ctx)).resolves.toEqual({ totalCases: 12 });
      expect(sent(request)).toEqual([
        { url: `${BASE}/case/search`, method: 'POST', body: { search_from: 0, search_to: 1 } },
      ]);
    });

    it('fails on a rejected key', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValueOnce(httpError(401));
      await expect(CortexXdr.test?.handler(ctx)).rejects.toThrow('authentication failed');
    });
  });

  describe('getEndpoints', () => {
    it('maps every filter, the sort and the first page', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(
        ok({ reply: { total_count: 1, result_count: 1, endpoints: [{ endpoint_id: EP }] } })
      );
      const result = await runAction(ctx, 'getEndpoints', {
        endpointIds: [EP],
        hostnames: ['host-1'],
        ipList: ['10.0.0.5'],
        platform: 'windows',
        isolate: 'unisolated',
        endpointStatus: ['connected'],
        scanStatus: ['success'],
        sortField: 'last_seen',
        sortOrder: 'ASC',
      });
      expect(sent(request)[0]).toEqual({
        url: `${BASE}/endpoints/get_endpoint`,
        method: 'POST',
        body: {
          filters: [
            { field: 'endpoint_id_list', operator: 'in', value: [EP] },
            { field: 'hostname', operator: 'in', value: ['host-1'] },
            { field: 'ip_list', operator: 'in', value: ['10.0.0.5'] },
            { field: 'platform', operator: 'in', value: ['windows'] },
            { field: 'isolate', operator: 'in', value: ['unisolated'] },
            { field: 'endpoint_status', operator: 'in', value: ['connected'] },
            { field: 'scan_status', operator: 'in', value: ['success'] },
          ],
          sort: { field: 'last_seen', keyword: 'ASC' },
          search_from: 0,
          search_to: 100,
        },
      });
      expect(result).toEqual({
        reply: { total_count: 1, result_count: 1, endpoints: [{ endpoint_id: EP }] },
        pagesFetched: 1,
        nextSearchFrom: null,
      });
    });

    it('lists every endpoint with an empty filter list and continues from searchFrom', async () => {
      const { ctx, request } = createContext();
      const endpoints = Array.from({ length: 100 }, (_, i) => ({ endpoint_id: `e${i}` }));
      request
        .mockResolvedValueOnce(ok({ reply: { total_count: 450, endpoints } }))
        .mockResolvedValueOnce(ok({ reply: { total_count: 450, endpoints } }));
      const result = await runAction(ctx, 'getEndpoints', { searchFrom: 100, maxResults: 200 });
      expect(sent(request).map(({ body }) => body)).toEqual([
        { filters: [], search_from: 100, search_to: 200 },
        { filters: [], search_from: 200, search_to: 300 },
      ]);
      expect(result).toMatchObject({ pagesFetched: 2, nextSearchFrom: 300 });
    });

    it.each([
      [{ maxResults: 501 }],
      [{ endpointIds: Array(101).fill(EP) }],
      [{ hostnames: ['h'.repeat(256)] }],
      [{ endpointStatus: ['online'] }],
    ])('rejects %j', (input) => {
      expect(CortexXdr.actions.getEndpoints.input.safeParse(input).success).toBe(false);
    });
  });

  describe('isolateEndpoint and unisolateEndpoint', () => {
    const endpointsReply = (endpoints: Array<{ endpoint_id: string; is_isolated: string }>) =>
      ok({ reply: { total_count: endpoints.length, endpoints } });

    it('isolates only the ids that exist and are not already isolated', async () => {
      const { ctx, request } = createContext();
      request
        .mockResolvedValueOnce(
          endpointsReply([
            { endpoint_id: 'e1', is_isolated: 'AGENT_UNISOLATED' },
            { endpoint_id: 'e2', is_isolated: 'AGENT_ISOLATED' },
            { endpoint_id: 'e3', is_isolated: 'AGENT_PENDING_ISOLATION' },
            { endpoint_id: 'e4', is_isolated: 'SOMETHING_NEW' },
          ])
        )
        .mockResolvedValueOnce(ok({ reply: { action_id: '501', endpoints_count: '2' } }));
      const result = await runAction(ctx, 'isolateEndpoint', {
        endpointIds: ['e1', 'e2', 'e3', 'e4', 'e5'],
        caseId: '88',
      });
      expect(sent(request)).toEqual([
        {
          url: `${BASE}/endpoints/get_endpoint`,
          method: 'POST',
          body: {
            filters: [
              { field: 'endpoint_id_list', operator: 'in', value: ['e1', 'e2', 'e3', 'e4', 'e5'] },
            ],
            search_from: 0,
            search_to: 100,
          },
        },
        {
          url: `${BASE}/endpoints/isolate`,
          method: 'POST',
          body: {
            filters: [{ field: 'endpoint_id_list', operator: 'in', value: ['e1', 'e4'] }],
            incident_id: '88',
          },
        },
      ]);
      expect(result).toEqual({
        reply: { action_id: '501', endpoints_count: '2' },
        requested: ['e1', 'e4'],
        skipped: [
          { endpointId: 'e2', isIsolated: 'AGENT_ISOLATED' },
          { endpointId: 'e3', isIsolated: 'AGENT_PENDING_ISOLATION' },
        ],
        notFound: ['e5'],
      });
    });

    it('sends nothing when every endpoint is already unisolated', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(
        endpointsReply([{ endpoint_id: 'e1', is_isolated: 'AGENT_PENDING_ISOLATION_CANCELLATION' }])
      );
      const result = await runAction(ctx, 'unisolateEndpoint', { endpointIds: ['e1'] });
      expect(request).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        reply: null,
        requested: [],
        skipped: [{ endpointId: 'e1', isIsolated: 'AGENT_PENDING_ISOLATION_CANCELLATION' }],
        notFound: [],
      });
    });

    it('fails and sends nothing when none of the endpoint ids exist', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(endpointsReply([]));
      await expect(
        runAction(ctx, 'isolateEndpoint', { endpointIds: ['missing-1', 'missing-2'] })
      ).rejects.toThrow('Cortex XDR found none of the endpoint ids: missing-1, missing-2');
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('returns the same skipped result on a repeat call', async () => {
      const { ctx, request } = createContext();
      const isolated = endpointsReply([{ endpoint_id: 'e1', is_isolated: 'AGENT_ISOLATED' }]);
      request.mockResolvedValueOnce(isolated).mockResolvedValueOnce(isolated);
      const first = await runAction(ctx, 'isolateEndpoint', { endpointIds: ['e1'] });
      const second = await runAction(ctx, 'isolateEndpoint', { endpointIds: ['e1'] });
      expect(second).toEqual(first);
      expect(second).toMatchObject({ reply: null, requested: [], notFound: [] });
      expect(request).toHaveBeenCalledTimes(2);
    });

    it('fails when the endpoint lookup fails, without sending the change', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValueOnce(httpError(403, { reply: { err_msg: 'Forbidden' } }));
      await expect(runAction(ctx, 'isolateEndpoint', { endpointIds: ['e1'] })).rejects.toThrow(
        "The API key's role lacks the permission"
      );
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('reports a 500 about unusable endpoints without retrying', async () => {
      const { ctx, request } = createContext();
      request
        .mockResolvedValueOnce(
          endpointsReply([{ endpoint_id: 'e1', is_isolated: 'AGENT_ISOLATED' }])
        )
        .mockRejectedValueOnce(
          httpError(500, {
            reply: { err_msg: 'No endpoint was found for creating the requested action' },
          })
        );
      await expect(runAction(ctx, 'unisolateEndpoint', { endpointIds: ['e1'] })).rejects.toThrow(
        'None of the endpoint ids match an endpoint that can run this action'
      );
      expect(request).toHaveBeenCalledTimes(2);
    });

    it.each([
      [{ endpointIds: [] }],
      [{ endpointIds: Array(1001).fill(EP) }],
      [{ endpointIds: [EP], caseId: 'abc' }],
    ])('rejects %j', (input) => {
      expect(CortexXdr.actions.isolateEndpoint.input.safeParse(input).success).toBe(false);
    });
  });

  it.each([
    ['scanEndpoint', '/endpoints/scan'],
    ['cancelScan', '/endpoints/abort_scan'],
  ])('%s sends the endpoint id filter, never "all"', async (name, route) => {
    const { ctx, request } = createContext();
    request.mockResolvedValueOnce(ok({ reply: { action_id: '7', endpoints_count: '1' } }));
    await expect(runAction(ctx, name, { endpointIds: [EP] })).resolves.toEqual({
      reply: { action_id: '7', endpoints_count: '1' },
    });
    expect(sent(request)).toEqual([
      {
        url: `${BASE}${route}`,
        method: 'POST',
        body: { filters: [{ field: 'endpoint_id_list', operator: 'in', value: [EP] }] },
      },
    ]);
  });

  it('getActionStatus sends the action id as an integer', async () => {
    const { ctx, request } = createContext();
    request.mockResolvedValueOnce(ok({ reply: { data: { [EP]: 'COMPLETED_SUCCESSFULLY' } } }));
    await expect(runAction(ctx, 'getActionStatus', { actionId: '501' })).resolves.toEqual({
      reply: { data: { [EP]: 'COMPLETED_SUCCESSFULLY' } },
    });
    expect(sent(request)[0].body).toEqual({ group_action_id: 501 });
    expect(CortexXdr.actions.getActionStatus.input.safeParse({ actionId: '5a' }).success).toBe(
      false
    );
    expect(CortexXdr.actions.getActionStatus.input.safeParse({ actionId: 0 }).success).toBe(false);
  });

  describe('endpoint tags', () => {
    it('assigns a tag and confirms', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(ok(true));
      await expect(
        runAction(ctx, 'addEndpointTag', { endpointIds: [EP], tag: 'under-investigation' })
      ).resolves.toEqual({ success: true, tag: 'under-investigation', endpointIds: [EP] });
      expect(sent(request)[0]).toEqual({
        url: `${BASE}/tags/agents/assign`,
        method: 'POST',
        body: {
          filters: [{ field: 'endpoint_id_list', operator: 'in', value: [EP] }],
          tag: 'under-investigation',
        },
      });
    });

    it('fails when removal is not confirmed', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(ok(false));
      await expect(
        runAction(ctx, 'removeEndpointTag', { endpointIds: [EP], tag: 'x' })
      ).rejects.toThrow('did not confirm the change');
    });
  });
});
