/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
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

  describe('XQL', () => {
    it('runXqlQuery sends a relative time frame and returns the query id', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(ok({ reply: 'q_123' }));
      await expect(
        runAction(ctx, 'runXqlQuery', {
          query: 'dataset = xdr_data | limit 1',
          relativeTime: 3600000,
        })
      ).resolves.toEqual({ queryId: 'q_123', reply: 'q_123' });
      expect(sent(request)[0]).toEqual({
        url: `${BASE}/xql/start_xql_query`,
        method: 'POST',
        body: { query: 'dataset = xdr_data | limit 1', timeframe: { relativeTime: 3600000 } },
      });
    });

    it('runXqlQuery sends an absolute time frame', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(ok({ reply: 'q_1' }));
      await runAction(ctx, 'runXqlQuery', { query: 'x', fromTime: 1, toTime: 2 });
      expect(sent(request)[0].body).toEqual({ query: 'x', timeframe: { from: 1, to: 2 } });
    });

    it.each([
      ['both forms', { query: 'x', relativeTime: 1, fromTime: 1, toTime: 2 }],
      ['fromTime alone', { query: 'x', fromTime: 1 }],
      ['fromTime after toTime', { query: 'x', fromTime: 5, toTime: 2 }],
      ['a query over 10000 characters', { query: 'x'.repeat(10_001) }],
    ])('runXqlQuery rejects %s', (_label, input) => {
      expect(CortexXdr.actions.runXqlQuery.input.safeParse(input).success).toBe(false);
    });

    it('getXqlResults defaults to pending_flag true and json', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(ok({ reply: { status: 'PENDING' } }));
      await expect(runAction(ctx, 'getXqlResults', { queryId: 'q_123' })).resolves.toEqual({
        reply: { status: 'PENDING' },
      });
      expect(sent(request)[0].body).toEqual({
        query_id: 'q_123',
        pending_flag: true,
        format: 'json',
      });
      expect(
        CortexXdr.actions.getXqlResults.input.safeParse({ queryId: 'q', limit: 1001 }).success
      ).toBe(false);
    });
  });

  describe('indicators', () => {
    it('insertIndicators sends request_data as an array with vendor field names', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(
        ok({ added_objects: [{ id: 1, status: 'ok' }], updated_objects: [], errors: [] })
      );
      const result = await runAction(ctx, 'insertIndicators', {
        indicators: [
          {
            indicator: 'evil.example',
            type: 'DOMAIN_NAME',
            severity: 'SEV_040_HIGH',
            ruleId: 12,
            expirationDate: 1900000000000,
            defaultExpirationEnabled: false,
            comment: 'IR-42',
            reputation: 'BAD',
            reliability: 'A',
          },
        ],
      });
      expect(sent(request)[0].body).toEqual([
        {
          indicator: 'evil.example',
          type: 'DOMAIN_NAME',
          severity: 'SEV_040_HIGH',
          rule_id: 12,
          expiration_date: 1900000000000,
          default_expiration_enabled: false,
          comment: 'IR-42',
          reputation: 'BAD',
          reliability: 'A',
        },
      ]);
      expect(result).toEqual({
        added_objects: [{ id: 1, status: 'ok' }],
        updated_objects: [],
        errors: [],
      });
    });

    it('getIndicators filters with EQ and pages on objects_count', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(
        ok({
          objects_count: 1,
          objects_type: 'IOC',
          objects: [{ rule_id: 12, indicator: 'evil.example' }],
        })
      );
      const result = await runAction(ctx, 'getIndicators', {
        indicator: 'evil.example',
        type: 'domain_name',
      });
      expect(sent(request)[0]).toEqual({
        url: `${BASE}/indicators/get`,
        method: 'POST',
        body: {
          filters: [
            { field: 'indicator', operator: 'EQ', value: 'evil.example' },
            { field: 'type', operator: 'EQ', value: 'domain_name' },
          ],
          search_from: 0,
          search_to: 100,
        },
      });
      expect(result).toEqual({
        objects_count: 1,
        objects_type: 'IOC',
        objects: [{ rule_id: 12, indicator: 'evil.example' }],
        pagesFetched: 1,
        nextSearchFrom: null,
      });
    });
  });

  describe('audit logs, policy, device control and users', () => {
    it.each([
      ['management', '/audits/management_logs', { emails: ['a@example.com'] }, 'email'],
      ['agent', '/audits/agents_reports', { endpointIds: [EP] }, 'endpoint_id'],
    ])('getAuditLogs reads the %s log', async (logType, route, extra, field) => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(ok({ reply: { total_count: 0, data: [] } }));
      await runAction(ctx, 'getAuditLogs', {
        logType,
        timestampFrom: 5,
        results: ['SUCCESS'],
        ...extra,
      });
      const { url, body } = sent(request)[0];
      expect(url).toBe(`${BASE}${route}`);
      expect(body.filters).toEqual([
        { field: 'timestamp', operator: 'gte', value: 5 },
        { field: 'result', operator: 'in', value: ['SUCCESS'] },
        { field, operator: 'in', value: Object.values(extra)[0] },
      ]);
    });

    it('getAuditLogs keeps each filter to its own log', () => {
      const schema = CortexXdr.actions.getAuditLogs.input;
      expect(schema.safeParse({ logType: 'agent', emails: ['a@example.com'] }).success).toBe(false);
      expect(schema.safeParse({ logType: 'management', endpointIds: [EP] }).success).toBe(false);
    });

    it('getPolicy reads one endpoint policy', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(ok({ reply: { policy_name: 'Default' } }));
      await expect(runAction(ctx, 'getPolicy', { endpointId: EP })).resolves.toEqual({
        reply: { policy_name: 'Default' },
      });
      expect(sent(request)[0].body).toEqual({ endpoint_id: EP });
    });

    it('getDeviceControlViolations maps filters and keeps the total', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(
        ok({ reply: { total_count: 1, violations: [{ violation_id: 1 }] } })
      );
      const result = await runAction(ctx, 'getDeviceControlViolations', {
        hostnames: ['h1'],
        types: ['disk drive'],
        timestampTo: 9,
      });
      expect(sent(request)[0].body.filters).toEqual([
        { field: 'hostname', operator: 'in', value: ['h1'] },
        { field: 'type', operator: 'in', value: ['disk drive'] },
        { field: 'timestamp', operator: 'lte', value: 9 },
      ]);
      expect(result).toMatchObject({ reply: { total_count: 1, result_count: 1 } });
    });

    it('getRiskyUsers sorts by score, highest first', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(
        ok({ reply: [{ id: 'a', score: 2 }, { id: 'b', score: 9 }, { id: 'c' }] })
      );
      await expect(runAction(ctx, 'getRiskyUsers', {})).resolves.toEqual({
        reply: [{ id: 'b', score: 9 }, { id: 'a', score: 2 }, { id: 'c' }],
      });
      // The documented body is an empty object, without the request_data envelope.
      expect(request.mock.calls[0][0]).toMatchObject({
        url: `${BASE}/get_risky_users`,
        method: 'POST',
      });
      expect(request.mock.calls[0][0].data).toEqual({});
    });

    it('getRiskyUsers explains a missing license', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValueOnce(httpError(402));
      await expect(runAction(ctx, 'getRiskyUsers', {})).rejects.toThrow('license');
    });
  });
});
