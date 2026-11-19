/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosInstance } from 'axios';
import { loggerMock } from '@kbn/logging-mocks';
import type { ActionContext } from '../../connector_spec';
import { Crowdstrike2 } from './crowdstrike2';
import { serializeParams, timing } from './client';

const BASE = 'https://api.us-2.crowdstrike.com';
const JOBS = `${BASE}/humio/api/v1/repositories/search-all/queryjobs`;
const SEARCH_ID = 'P2-abc_123-XYZ';
const SCOPE_TEXT =
  'the NGSIEM scope (console label NGSIEM, Read and Write; API scope humio-auth-proxy)';

interface Reply {
  status?: number;
  data?: unknown;
  headers?: Record<string, unknown>;
}

const makeCtx = (replies: Reply[]) => {
  const request = jest.fn();
  for (const reply of replies) {
    request.mockResolvedValueOnce({ status: 200, headers: {}, data: {}, ...reply });
  }
  request.mockResolvedValue({ status: 200, headers: {}, data: {} });
  const ctx = {
    client: { request } as unknown as AxiosInstance,
    config: { region: 'us-2' },
    secrets: {},
    log: loggerMock.create(),
    getClient: jest.fn(),
  } as unknown as ActionContext;
  const calls = () =>
    request.mock.calls.map(([c]) => {
      const query = c.params ? serializeParams(c.params) : '';
      return { method: c.method, url: query ? `${c.url}?${query}` : c.url, data: c.data };
    });
  return { ctx, request, calls };
};

const action = (name: string) => Crowdstrike2.actions[name];

const run = async (name: string, input: unknown, replies: Reply[] = []) => {
  const { ctx, request, calls } = makeCtx(replies);
  const parsed = action(name).input.parse(input);
  const result = await action(name).handler(ctx, parsed);
  return { result, request, calls };
};

const runError = async (name: string, input: unknown, replies: Reply[]) => {
  const { ctx, request } = makeCtx(replies);
  const parsed = action(name).input.parse(input);
  const error = await action(name)
    .handler(ctx, parsed)
    .then(
      () => undefined,
      (e: Error) => e
    );
  return { error, request };
};

const accepts = (name: string, input: unknown) => action(name).input.safeParse(input).success;

let sleep: jest.SpyInstance;
beforeEach(() => {
  sleep = jest.spyOn(timing, 'sleep').mockResolvedValue(undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('CrowdStrike Falcon connector, Next-Gen SIEM search actions', () => {
  it('places start, results and stop right after spotlightSearchVulnerability, as agent tools with a scope', () => {
    const names = Object.keys(Crowdstrike2.actions);
    const at = names.indexOf('spotlightSearchVulnerability');
    expect(names.slice(at + 1, at + 4)).toEqual([
      'startNgSiemSearch',
      'getNgSiemSearchResults',
      'stopNgSiemSearch',
    ]);
    expect(action('startNgSiemSearch')).toMatchObject({ isTool: true, scope: 'read' });
    expect(action('getNgSiemSearchResults')).toMatchObject({ isTool: true, scope: 'read' });
    expect(action('stopNgSiemSearch')).toMatchObject({ isTool: true, scope: 'destroy' });
  });

  describe('startNgSiemSearch', () => {
    it('[C-startNgSiemSearch-happy] posts the query to the search-all view, never live, end defaulting to now', async () => {
      const { result, calls } = await run(
        'startNgSiemSearch',
        { query: '#event_simpleName=ProcessRollup2 | head(100)', start: '24h' },
        [{ status: 200, data: { id: SEARCH_ID, hashedQueryOnView: 'h' } }]
      );
      expect(calls()).toEqual([
        {
          method: 'POST',
          url: JOBS,
          data: {
            queryString: '#event_simpleName=ProcessRollup2 | head(100)',
            start: '24h',
            end: 'now',
            isLive: false,
          },
        },
      ]);
      expect(result).toEqual({ id: SEARCH_ID });
    });

    it('[C-startNgSiemSearch-happy] sends an explicit end and epoch milliseconds as given', async () => {
      const { calls } = await run(
        'startNgSiemSearch',
        { query: '#repo=base_sensor', start: '1731900000000', end: '1731903600000' },
        [{ data: { id: 'job-2' } }]
      );
      expect(calls()[0].data).toEqual({
        queryString: '#repo=base_sensor',
        start: '1731900000000',
        end: '1731903600000',
        isLive: false,
      });
    });

    it('[C-startNgSiemSearch-input] accepts the documented time formats and the query bounds', () => {
      for (const start of ['1s', '15m', '24h', '7d', '2w', '1y', '1731900000000']) {
        expect(accepts('startNgSiemSearch', { query: 'x', start })).toBe(true);
      }
      expect(accepts('startNgSiemSearch', { query: 'x', start: '1h', end: 'now' })).toBe(true);
      expect(accepts('startNgSiemSearch', { query: 'q'.repeat(10_000), start: '1h' })).toBe(true);
    });

    it('[C-startNgSiemSearch-input] refuses start now, malformed times, an empty or over-long query', () => {
      const refused = [
        { query: 'x', start: 'now' },
        { query: 'x', start: '24 h' },
        { query: 'x', start: '5x' },
        { query: 'x', start: '173190000000' },
        { query: 'x', start: '17319000000000' },
        { query: 'x', start: '-1h' },
        { query: 'x', start: '1h', end: 'yesterday' },
        { query: 'x', start: '1h', end: '' },
        { query: '', start: '1h' },
        { query: 'q'.repeat(10_001), start: '1h' },
        { start: '1h' },
        { query: 'x' },
      ];
      for (const input of refused) {
        expect(accepts('startNgSiemSearch', input)).toBe(false);
      }
    });

    it('[C-startNgSiemSearch-input] has no repository input: an extra repository key never reaches the path', async () => {
      const { calls } = await run(
        'startNgSiemSearch',
        { query: 'x', start: '1h', repository: '../../admin' },
        [{ data: { id: 'job-3' } }]
      );
      expect(calls()[0].url).toBe(JOBS);
      expect(calls()[0].data).not.toHaveProperty('repository');
    });

    it('[C-startNgSiemSearch-errors] does not retry a 5xx, which could start a second search job', async () => {
      const { error, request } = await runError('startNgSiemSearch', { query: 'x', start: '1h' }, [
        { status: 503, data: 'service unavailable' },
      ]);
      expect(error?.message).toBe('Status code: 503. Message: service unavailable');
      expect(request).toHaveBeenCalledTimes(1);
      expect(sleep).not.toHaveBeenCalled();
    });

    it('[C-startNgSiemSearch-errors] does not retry a timeout', async () => {
      const { ctx, request } = makeCtx([]);
      request.mockReset();
      request.mockRejectedValue(
        Object.assign(new Error('timeout of 60000ms exceeded'), {
          isAxiosError: true,
          code: 'ECONNABORTED',
        })
      );
      const input = action('startNgSiemSearch').input.parse({ query: 'x', start: '1h' });
      await expect(action('startNgSiemSearch').handler(ctx, input)).rejects.toThrow(
        'Could not reach api.us-2.crowdstrike.com: timeout'
      );
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('[C-startNgSiemSearch-errors] retries a 429 and then returns the id', async () => {
      const { result, request } = await run('startNgSiemSearch', { query: 'x', start: '1h' }, [
        { status: 429, headers: { 'Retry-After': '2' }, data: 'rate limited' },
        { data: { id: 'job-4' } },
      ]);
      expect(result).toEqual({ id: 'job-4' });
      expect(request).toHaveBeenCalledTimes(2);
      expect(sleep).toHaveBeenCalledTimes(1);
    });

    it("[C-startNgSiemSearch-errors] passes Falcon's text message through on a bad query", async () => {
      const { error } = await runError('startNgSiemSearch', { query: 'groupBy(', start: '1h' }, [
        { status: 400, data: '  Unexpected end of query at position 8  ' },
      ]);
      expect(error?.message).toBe(
        'Status code: 400. Message: Unexpected end of query at position 8'
      );
    });

    it('[C-startNgSiemSearch-errors] names the Next-Gen SIEM scope on a 403', async () => {
      const { error } = await runError('startNgSiemSearch', { query: 'x', start: '1h' }, [
        { status: 403, data: 'access denied, scope not permitted' },
      ]);
      expect(error?.message).toBe(
        `Status code: 403. Message: access denied, scope not permitted; the API client needs ${SCOPE_TEXT} for this action`
      );
    });

    it('[C-startNgSiemSearch-errors] fails when Falcon returns no search id', async () => {
      const { error } = await runError('startNgSiemSearch', { query: 'x', start: '1h' }, [
        { data: { hashedQueryOnView: 'h' } },
      ]);
      expect(error?.message).toBe('Falcon Next-Gen SIEM did not return a search id.');
    });
  });

  describe('getNgSiemSearchResults', () => {
    it('[C-getNgSiemSearchResults-happy] [C-edge-next-gen-siem-search-still-running] returns done false with the events so far, without waiting', async () => {
      const { result, request, calls } = await run('getNgSiemSearchResults', { id: SEARCH_ID }, [
        { data: { done: false, events: [{ aid: 'a1' }], metaData: { eventCount: 1 } } },
      ]);
      expect(calls()).toEqual([{ method: 'GET', url: `${JOBS}/${SEARCH_ID}`, data: undefined }]);
      expect(result).toEqual({ done: false, events: [{ aid: 'a1' }], metaData: { eventCount: 1 } });
      expect(request).toHaveBeenCalledTimes(1);
      expect(sleep).not.toHaveBeenCalled();
    });

    it('[C-getNgSiemSearchResults-happy] returns done true with every event and passes metaData through', async () => {
      const events = [{ aid: 'a1', ComputerName: 'C-LAB-10' }, { aid: 'a2' }];
      const metaData = { eventCount: 2, isAggregate: false, totalWork: 10, workDone: 10 };
      const { result } = await run('getNgSiemSearchResults', { id: SEARCH_ID }, [
        { data: { done: true, events, metaData } },
      ]);
      expect(result).toEqual({ done: true, events, metaData });
    });

    it('[C-getNgSiemSearchResults-happy] treats a missing done as false and missing events as empty, without metaData', async () => {
      const { result } = await run('getNgSiemSearchResults', { id: SEARCH_ID }, [{ data: {} }]);
      expect(result).toEqual({ done: false, events: [] });
      const truthy = await run('getNgSiemSearchResults', { id: SEARCH_ID }, [
        { data: { done: 'true', events: 'x' } },
      ]);
      expect(truthy.result).toEqual({ done: false, events: [] });
    });

    it('[C-getNgSiemSearchResults-paging] maps offset and limit to paginationOffset and paginationLimit', async () => {
      const { calls } = await run(
        'getNgSiemSearchResults',
        { id: SEARCH_ID, offset: 0, limit: 1000 },
        [{ data: { done: true, events: [] } }]
      );
      expect(calls()[0].url).toBe(`${JOBS}/${SEARCH_ID}?paginationOffset=0&paginationLimit=1000`);
      const second = await run('getNgSiemSearchResults', { id: SEARCH_ID, offset: 200 }, [
        { data: { done: true, events: [] } },
      ]);
      expect(second.calls()[0].url).toBe(`${JOBS}/${SEARCH_ID}?paginationOffset=200`);
    });

    it('[C-getNgSiemSearchResults-paging] refuses a page size over 1000, under 1, and a negative offset', () => {
      expect(accepts('getNgSiemSearchResults', { id: SEARCH_ID, limit: 1001 })).toBe(false);
      expect(accepts('getNgSiemSearchResults', { id: SEARCH_ID, limit: 0 })).toBe(false);
      expect(accepts('getNgSiemSearchResults', { id: SEARCH_ID, offset: -1 })).toBe(false);
      expect(accepts('getNgSiemSearchResults', { id: SEARCH_ID, limit: 1.5 })).toBe(false);
    });

    it('[C-getNgSiemSearchResults-input] [C-edge-next-gen-siem-search-id-in-the-path] refuses ids outside letters, digits, - and _', () => {
      for (const id of ['', '../queryjobs', 'a/b', 'a b', 'a?b=1', 'a%2Fb', 'é', 'a'.repeat(129)]) {
        expect(accepts('getNgSiemSearchResults', { id })).toBe(false);
        expect(accepts('stopNgSiemSearch', { id })).toBe(false);
      }
      expect(accepts('getNgSiemSearchResults', { id: 'a'.repeat(128) })).toBe(true);
    });

    it('[C-edge-next-gen-siem-search-id-in-the-path] checks the id again in the handler, before any request', async () => {
      for (const name of ['getNgSiemSearchResults', 'stopNgSiemSearch']) {
        const { ctx, request } = makeCtx([]);
        await expect(action(name).handler(ctx, { id: '../../x' })).rejects.toThrow(
          'A search id has letters, digits, - and _ only'
        );
        expect(request).not.toHaveBeenCalled();
      }
    });

    it('[C-getNgSiemSearchResults-errors] reports a 404 as a search that was not found or expired', async () => {
      const { error, request } = await runError('getNgSiemSearchResults', { id: SEARCH_ID }, [
        { status: 404, data: 'Query job not found' },
      ]);
      expect(error?.message).toBe('Status code: 404. Message: search job not found or expired');
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('[C-getNgSiemSearchResults-errors] retries a 5xx (read) and names the scope on a 403', async () => {
      const retried = await run('getNgSiemSearchResults', { id: SEARCH_ID }, [
        { status: 502, data: 'bad gateway' },
        { data: { done: true, events: [] } },
      ]);
      expect(retried.result).toEqual({ done: true, events: [] });
      expect(retried.request).toHaveBeenCalledTimes(2);
      const { error } = await runError('getNgSiemSearchResults', { id: SEARCH_ID }, [
        {
          status: 403,
          data: { errors: [{ code: 403, message: 'access denied, scope not permitted' }] },
        },
      ]);
      expect(error?.message).toContain(`the API client needs ${SCOPE_TEXT}`);
    });
  });

  describe('stopNgSiemSearch', () => {
    it('[C-stopNgSiemSearch-happy] [C-stopNgSiemSearch-mutate] sends one DELETE for the job, without query or body', async () => {
      const { result, calls } = await run('stopNgSiemSearch', { id: SEARCH_ID }, [
        { status: 204, data: '' },
      ]);
      expect(calls()).toEqual([{ method: 'DELETE', url: `${JOBS}/${SEARCH_ID}`, data: undefined }]);
      expect(result).toEqual({
        stopped: true,
        id: SEARCH_ID,
        outcomes: [{ id: SEARCH_ID, status: 'requested' }],
      });
    });

    it('[C-edge-stopping-a-finished-expired-or-stopped-n] returns stopped false on a 404 instead of an error', async () => {
      const { result, request } = await run('stopNgSiemSearch', { id: SEARCH_ID }, [
        { status: 404, data: 'Query job not found' },
      ]);
      expect(result).toEqual({
        stopped: false,
        id: SEARCH_ID,
        outcomes: [{ id: SEARCH_ID, status: 'notFound' }],
      });
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('[C-stopNgSiemSearch-errors] retries a 5xx (idempotent in effect), names the scope on a 403 and fails on a 400', async () => {
      const retried = await run('stopNgSiemSearch', { id: SEARCH_ID }, [
        { status: 503, data: '' },
        { status: 204, data: '' },
      ]);
      expect(retried.result).toEqual({
        stopped: true,
        id: SEARCH_ID,
        outcomes: [{ id: SEARCH_ID, status: 'requested' }],
      });
      expect(retried.request).toHaveBeenCalledTimes(2);
      const forbidden = await runError('stopNgSiemSearch', { id: SEARCH_ID }, [
        { status: 403, data: 'access denied, scope not permitted' },
      ]);
      expect(forbidden.error?.message).toBe(
        `Status code: 403. Message: access denied, scope not permitted; the API client needs ${SCOPE_TEXT} for this action`
      );
      const bad = await runError('stopNgSiemSearch', { id: SEARCH_ID }, [
        { status: 400, data: 'bad request' },
      ]);
      expect(bad.error?.message).toBe('Status code: 400. Message: bad request');
    });

    it('[C-stopNgSiemSearch-input] requires an id', () => {
      expect(accepts('stopNgSiemSearch', {})).toBe(false);
      expect(accepts('stopNgSiemSearch', { id: SEARCH_ID })).toBe(true);
    });
  });
});
