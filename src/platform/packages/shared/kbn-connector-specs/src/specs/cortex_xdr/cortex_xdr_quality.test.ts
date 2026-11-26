/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { describeHttpError, retryDelayMs, timing, xdrRequest } from './client';
import { CortexXdr } from './cortex_xdr';

/** The fields the assertions below read from action results. */
interface Result {
  skipped: unknown;
  notFound: unknown;
  requested: unknown;
  reply: { action_id: unknown; results: { stream_id: unknown }; 0: { status: boolean } };
  results: Array<{ success: boolean; notFound?: boolean }>;
  succeeded: number;
  failed: number;
  found: boolean;
  case: { case_id: number };
  errors: Array<{ part: string }>;
  files: Array<{ contentBase64?: string }>;
}

const API_URL = 'https://api-tenant.xdr.us.paloaltonetworks.com';
const BASE = `${API_URL}/public_api/v1`;
const EP = 'endpoint-1';
const SHA = 'c'.repeat(64);

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

const run = (ctx: ActionContext, name: string, input: unknown) => {
  const action = CortexXdr.actions[name];
  return action.handler(ctx, action.input.parse(input));
};

describe('Cortex XDR quality contract', () => {
  let sleep: jest.SpyInstance;
  beforeEach(() => {
    sleep = jest.spyOn(timing, 'sleep').mockResolvedValue();
  });
  afterEach(() => jest.restoreAllMocks());

  describe('retry policy of the shared client', () => {
    it.each([429, 500, 502, 503, 504])(
      'retries a read answered with HTTP %s twice, then succeeds on attempt 3',
      async (status) => {
        const { ctx, request } = createContext();
        request
          .mockRejectedValueOnce(httpError(status))
          .mockRejectedValueOnce(httpError(status))
          .mockResolvedValueOnce(ok({ reply: { policy_name: 'Default' } }));
        await expect(run(ctx, 'getPolicy', { endpointId: EP })).resolves.toEqual({
          reply: { policy_name: 'Default' },
        });
        expect(request).toHaveBeenCalledTimes(3);
        expect(sleep).toHaveBeenCalledTimes(2);
      }
    );

    it.each([429, 500, 502, 503, 504])(
      'gives up after 3 attempts when a read keeps answering HTTP %s',
      async (status) => {
        const { ctx, request } = createContext();
        request.mockRejectedValue(httpError(status));
        await expect(run(ctx, 'getPolicy', { endpointId: EP })).rejects.toThrow();
        expect(request).toHaveBeenCalledTimes(3);
      }
    );

    it.each([400, 401, 402, 403, 404])(
      'does not retry HTTP %s: one request, the error is surfaced',
      async (status) => {
        const { ctx, request } = createContext();
        request.mockRejectedValue(httpError(status, { reply: { err_msg: 'denied' } }));
        await expect(run(ctx, 'getPolicy', { endpointId: EP })).rejects.toMatchObject({ status });
        expect(request).toHaveBeenCalledTimes(1);
        expect(sleep).not.toHaveBeenCalled();
      }
    );

    it('retries a state-changing call on 429 only', async () => {
      const { ctx, request } = createContext();
      request
        .mockRejectedValueOnce(httpError(429))
        .mockResolvedValueOnce(ok({ reply: { action_id: 5, endpoints_count: 1 } }));
      await run(ctx, 'scanEndpoint', { endpointIds: [EP] });
      expect(request).toHaveBeenCalledTimes(2);
    });

    it.each([500, 502, 503, 504])(
      'never retries a state-changing call after HTTP %s',
      async (status) => {
        const { ctx, request } = createContext();
        request.mockRejectedValue(httpError(status, { reply: { err_msg: 'boom' } }));
        await expect(run(ctx, 'scanEndpoint', { endpointIds: [EP] })).rejects.toMatchObject({
          status,
        });
        expect(request).toHaveBeenCalledTimes(1);
      }
    );

    it('backs off 1 s, 2 s, then caps at 4 s, each plus at most 250 ms of jitter', () => {
      const within = (n: number, base: number) => {
        const d = retryDelayMs(n);
        expect(d).toBeGreaterThanOrEqual(base);
        expect(d).toBeLessThan(base + 250);
      };
      within(1, 1000);
      within(2, 2000);
      within(3, 4000);
      within(6, 4000);
    });

    it('a 5xx during a state-changing call explains it was not retried', () => {
      expect(describeHttpError(503, {}, { stateChanging: true })).toContain('not retried');
    });
  });

  describe('product edge cases', () => {
    it('names the documented limit after 3 attempts', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(429));
      await expect(xdrRequest(ctx, { path: '/x', body: {} })).rejects.toThrow(
        'rate limit reached (10 requests per second per tenant); retried 3 times'
      );
      expect(request).toHaveBeenCalledTimes(3);
    });

    it('a 401 tells the user to check the Kibana host clock', () => {
      expect(describeHttpError(401, {})).toMatch(/clock is correct/);
    });

    it('a dispatched action returns its action id and getActionStatus is a separate read', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(ok({ reply: { action_id: 9, endpoints_count: 1 } }));
      const sent = (await run(ctx, 'scanEndpoint', { endpointIds: [EP] })) as {
        reply: { action_id: number };
      };
      expect(sent.reply.action_id).toBe(9);
      request.mockResolvedValueOnce(ok({ reply: { data: { [EP]: 'PENDING' } } }));
      await run(ctx, 'getActionStatus', { actionId: sent.reply.action_id });
      expect(request.mock.calls[1][0]).toMatchObject({
        url: `${BASE}/actions/get_action_status`,
        data: { request_data: { group_action_id: 9 } },
      });
    });

    it('skips an isolated id, reports an unknown one and sends only the rest', async () => {
      const { ctx, request } = createContext();
      request
        .mockResolvedValueOnce(
          ok({
            reply: {
              total_count: 2,
              endpoints: [
                { endpoint_id: 'a', is_isolated: 'AGENT_ISOLATED' },
                { endpoint_id: 'b', is_isolated: 'AGENT_UNISOLATED' },
              ],
            },
          })
        )
        .mockResolvedValueOnce(ok({ reply: { action_id: 3, endpoints_count: 1 } }));
      const result = (await run(ctx, 'isolateEndpoint', {
        endpointIds: ['a', 'b', 'zz'],
      })) as Result;
      expect(result.skipped).toEqual([{ endpointId: 'a', isIsolated: 'AGENT_ISOLATED' }]);
      expect(result.notFound).toEqual(['zz']);
      expect(result.requested).toEqual(['b']);
      expect(request.mock.calls[1][0].data.request_data.filters[0].value).toEqual(['b']);
    });

    it('sends nothing when every id is already isolated', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(
        ok({
          reply: {
            total_count: 1,
            endpoints: [{ endpoint_id: 'a', is_isolated: 'AGENT_ISOLATED' }],
          },
        })
      );
      const result = (await run(ctx, 'isolateEndpoint', { endpointIds: ['a'] })) as Result;
      expect(result.reply).toBeNull();
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('rejects an empty endpoint list before any request', () => {
      expect(() => CortexXdr.actions.scanEndpoint.input.parse({ endpointIds: [] })).toThrow();
      expect(() => CortexXdr.actions.scanEndpoint.input.parse({})).toThrow();
    });

    it('returns the 200 as is; getQuarantineStatus is the truth', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(ok({ reply: { action_id: 4, endpoints_count: 1 } }));
      const result = (await run(ctx, 'quarantineFile', {
        endpointIds: [EP],
        filePath: 'C:\\absent.exe',
        fileHash: SHA,
      })) as Result;
      expect(result.reply.action_id).toBe(4);
      request.mockResolvedValueOnce(
        ok({
          reply: [{ endpoint_id: EP, file_hash: SHA, file_path: 'C:\\absent.exe', status: false }],
        })
      );
      const status = (await run(ctx, 'getQuarantineStatus', {
        endpointId: EP,
        fileHash: SHA,
        filePath: 'C:\\absent.exe',
      })) as Result;
      expect(status.reply[0].status).toBe(false);
    });

    it('continues after a 404 and a 500, stops on a 403', async () => {
      const { ctx, request } = createContext();
      request
        .mockRejectedValueOnce(httpError(404))
        .mockRejectedValueOnce(httpError(500))
        .mockResolvedValueOnce(ok({}));
      const result = (await run(ctx, 'updateIssue', {
        issueIds: [1, 2, 3],
        status: 'In Progress',
      })) as Result;
      expect(result.results.map((r) => r.success)).toEqual([false, false, true]);
      expect(result.results[0].notFound).toBe(true);
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(2);
      const second = createContext();
      second.request.mockRejectedValueOnce(httpError(403));
      await expect(
        run(second.ctx, 'updateIssue', { issueIds: [1, 2], status: 'In Progress' })
      ).rejects.toMatchObject({ status: 403 });
      expect(second.request).toHaveBeenCalledTimes(1);
    });

    it('returns the case with the failed parts listed in errors', async () => {
      const { ctx, request } = createContext();
      request
        .mockResolvedValueOnce(ok({ reply: { DATA: [{ case_id: 7, issue_ids: [11] }] } }))
        .mockRejectedValueOnce(httpError(403))
        .mockRejectedValueOnce(httpError(403));
      const result = (await run(ctx, 'getCaseDetails', { caseId: 7 })) as Result;
      expect(result.found).toBe(true);
      expect(result.case.case_id).toBe(7);
      expect(result.errors.map((e) => e.part).sort()).toEqual(['artifacts', 'issues']);
    });

    it('a missing case id is found false without further calls', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(ok({ reply: { DATA: [] } }));
      const result = (await run(ctx, 'getCaseDetails', { caseId: 999 })) as Result;
      expect(result).toEqual({ found: false, caseId: 999 });
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('returns the vendor stream id without reading the stream', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(
        ok({ reply: { status: 'SUCCESS', number_of_results: 5000, results: { stream_id: 's-1' } } })
      );
      const result = (await run(ctx, 'getXqlResults', { queryId: 'q1' })) as Result;
      expect(result.reply.results.stream_id).toBe('s-1');
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('keeps the route and size, skips the content', async () => {
      const { ctx, request } = createContext();
      request
        .mockResolvedValueOnce(ok({ reply: { data: { ep1: `${BASE}/download/big` } } }))
        .mockResolvedValueOnce(ok(new Uint8Array(1000).buffer));
      const result = (await run(ctx, 'getRetrievedFileDetails', {
        actionId: 1,
        download: true,
        maxDownloadSizeBytes: 10,
      })) as Result;
      expect(result.files[0]).toMatchObject({
        downloadRoute: '/download/big',
        downloaded: false,
        sizeBytes: 1000,
        skippedReason: 'larger than maxDownloadSizeBytes',
      });
      expect(result.files[0].contentBase64).toBeUndefined();
      expect(() =>
        CortexXdr.actions.getRetrievedFileDetails.input.parse({
          actionId: 1,
          maxDownloadSizeBytes: 768001,
        })
      ).toThrow();
    });

    it('sends case ids as integers for restore and hash lists, and as strings for isolate, scan and run script', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue(ok({ reply: { action_id: 1, endpoints_count: 1 } }));
      await run(ctx, 'restoreFile', { fileHash: SHA, caseId: 12 });
      expect(request.mock.calls[0][0].data.request_data.incident_id).toBe(12);
      await run(ctx, 'scanEndpoint', { endpointIds: [EP], caseId: '12' });
      expect(request.mock.calls[1][0].data.request_data.incident_id).toBe('12');
      await run(ctx, 'runScript', { scriptUid: 'u', endpointIds: [EP], caseId: '12' });
      expect(request.mock.calls[2][0].data.request_data.incident_id).toBe('12');
      request.mockResolvedValue(ok(true));
      await run(ctx, 'blocklistFiles', { hashList: [SHA], caseId: 12 });
      expect(request.mock.calls[3][0].data.request_data.incident_id).toBe(12);
      expect(() =>
        CortexXdr.actions.restoreFile.input.parse({ fileHash: SHA, caseId: '12' })
      ).toThrow();
    });
  });

  describe('Cortex XDR enums accept every documented value and refuse others', () => {
    const accepts = (
      action: string,
      base: Record<string, unknown>,
      field: string,
      value: unknown
    ) => CortexXdr.actions[action].input.safeParse({ ...base, [field]: value }).success;
    const CASES: Array<[string, Record<string, unknown>, string, unknown[], boolean]> = [
      [
        'getEndpoints',
        {},
        'scanStatus',
        [
          'none',
          'pending',
          'in_progress',
          'canceled',
          'aborted',
          'pending_cancellation',
          'success',
          'error',
        ],
        true,
      ],
      [
        'getEndpoints',
        {},
        'endpointStatus',
        ['connected', 'disconnected', 'lost', 'uninstalled'],
        true,
      ],
      ['getEndpoints', {}, 'platform', ['windows', 'linux', 'macos', 'android'], false],
      ['getEndpoints', {}, 'isolate', ['isolated', 'unisolated'], false],
      ['getEndpoints', {}, 'sortField', ['endpoint_id', 'first_seen', 'last_seen'], false],
      ['getEndpoints', {}, 'sortOrder', ['ASC', 'DESC'], false],
      ['getCases', {}, 'severity', ['info', 'low', 'medium', 'high', 'critical'], true],
      [
        'getCases',
        {},
        'sortField',
        ['case_id', 'severity', 'creation_time', 'modification_time'],
        false,
      ],
      ['getCases', {}, 'sortOrder', ['asc', 'desc'], false],
      ['getIssues', {}, 'severity', ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], true],
      ['getIssues', {}, 'sortField', ['id', 'severity', 'observation_time'], false],
      ['updateIssue', { issueIds: [1] }, 'status', ['New', 'In Progress'], false],
      [
        'updateCase',
        { caseId: 1 },
        'userSeverity',
        ['low', 'medium', 'high', 'critical', ''],
        false,
      ],
      ['getXqlResults', { queryId: 'q' }, 'format', ['json', 'csv'], false],
    ];
    it.each(CASES)(
      '%s accepts each documented %s value, one value at a time',
      (action, base, field, values, isArray) => {
        for (const value of values) {
          expect(accepts(action, base, field, isArray ? [value] : value)).toBe(true);
        }
        expect(accepts(action, base, field, isArray ? ['__other__'] : '__other__')).toBe(false);
      }
    );
    it('getEndpoints accepts all 8 scanStatus values together and refuses a ninth entry', () => {
      const all = [
        'none',
        'pending',
        'in_progress',
        'canceled',
        'aborted',
        'pending_cancellation',
        'success',
        'error',
      ];
      expect(accepts('getEndpoints', {}, 'scanStatus', all)).toBe(true);
      expect(accepts('getEndpoints', {}, 'scanStatus', [...all, 'none'])).toBe(false);
    });
    it('updateIssue resolution reasons: every built-in reason is accepted with status Resolved', () => {
      const reasons = [
        'Resolved - Threat Handled',
        'Resolved - Known Issue',
        'Resolved - Duplicate Issue',
        'Resolved - False Positive',
        'Resolved - Other',
        'Resolved - True Positive',
        'Resolved - Security Testing',
        'Resolved - Risk Accepted',
        'Resolved - Fixed',
        'Resolved - Dismissed',
      ];
      for (const resolutionReason of reasons) {
        expect(
          CortexXdr.actions.updateIssue.input.safeParse({
            issueIds: [1],
            status: 'Resolved',
            resolutionReason,
          }).success
        ).toBe(true);
      }
      expect(
        CortexXdr.actions.updateIssue.input.safeParse({
          issueIds: [1],
          status: 'Resolved',
          resolutionReason: 'Nope',
        }).success
      ).toBe(false);
    });
  });

  describe('connection setup and connection test', () => {
    const parseUrl = (apiUrl: string) =>
      (
        CortexXdr.schema as unknown as { safeParse: (v: unknown) => { success: boolean } }
      ).safeParse({ apiUrl }).success;
    const runTest = (ctx: ActionContext) => {
      const handler = CortexXdr.test?.handler;
      if (!handler) throw new Error('the connector has no connection test');
      return handler(ctx);
    };
    it.each([
      ['https://api-mytenant.xdr.us.paloaltonetworks.com', true],
      ['https://api-mytenant.xdr.eu.paloaltonetworks.com/', true],
      ['https://api-mytenant.xdr.us.paloaltonetworks.com/public_api/v1', true],
      ['http://localhost:18080', true],
      ['http://api-mytenant.xdr.us.paloaltonetworks.com', false],
      ['https://user:pw@api-mytenant.xdr.us.paloaltonetworks.com', false],
      ['https://api-mytenant.xdr.us.paloaltonetworks.com/other', false],
      ['https://api-mytenant.xdr.us.paloaltonetworks.com/?x=1', false],
      ['not a url', false],
    ])('the tenant API URL %s is accepted: %s', (url, expected) => {
      expect(parseUrl(url)).toBe(expected);
    });

    it('the connection test reads one case (case/search, search_from 0, search_to 1) and returns the total', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(ok({ reply: { TOTAL_COUNT: 42, DATA: [] } }));
      const result = await runTest(ctx);
      expect(result).toEqual({ totalCases: 42 });
      expect(request.mock.calls[0][0]).toMatchObject({
        url: `${BASE}/case/search`,
        data: { request_data: { search_from: 0, search_to: 1 } },
      });
    });

    it('the connection test fails with the permission message when the role lacks View on Cases and Issues', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(403, { reply: { err_msg: 'forbidden' } }));
      await expect(runTest(ctx)).rejects.toThrow('lacks the permission');
    });
  });
});
