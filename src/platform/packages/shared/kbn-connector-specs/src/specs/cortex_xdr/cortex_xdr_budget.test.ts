/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { remainingBudgetMs, timing } from './client';
import { CortexXdr } from './cortex_xdr';

const API_URL = 'https://api-tenant.xdr.us.paloaltonetworks.com';
const BASE = `${API_URL}/public_api/v1`;

const ok = (data: unknown, status = 200) => ({ status, data, headers: {} });
const httpError = (status: number) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data: {}, headers: {} },
  });
const timeoutError = () =>
  Object.assign(new Error('timeout exceeded'), { isAxiosError: true, code: 'ECONNABORTED' });

const endpoints = (start: number, count: number, total: number) =>
  ok({
    reply: {
      total_count: total,
      endpoints: Array.from({ length: count }, (_, i) => ({
        endpoint_id: `ep${start + i}`,
        is_isolated: 'AGENT_UNISOLATED',
      })),
    },
  });

let clock = 0;

/** A request mock whose answers each take the given milliseconds of the run's budget. */
const createContext = () => {
  const request = jest.fn();
  const ctx = {
    client: { request },
    config: { apiUrl: API_URL },
    log: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;
  const answer = (takesMs: number, result: unknown, fails = false) =>
    request.mockImplementationOnce(async () => {
      clock += takesMs;
      if (fails) throw result;
      return result;
    });
  return { ctx, request, answer };
};

const runAction = (ctx: ActionContext, name: string, input: unknown) => {
  const action = CortexXdr.actions[name];
  return action.handler(ctx, action.input.parse(input));
};

describe('Cortex XDR time budget', () => {
  let sleep: jest.SpyInstance;
  beforeEach(() => {
    clock = 0;
    jest.spyOn(timing, 'now').mockImplementation(() => clock);
    sleep = jest.spyOn(timing, 'sleep').mockResolvedValue();
  });
  afterEach(() => jest.restoreAllMocks());

  it('gives each request what is left of the 100 s budget as its timeout', async () => {
    const { ctx, request, answer } = createContext();
    answer(70_000, endpoints(0, 100, 1000));
    answer(1_000, endpoints(100, 100, 1000));
    await runAction(ctx, 'getEndpoints', { maxResults: 200 });
    expect(request.mock.calls.map(([config]) => config.timeout)).toEqual([60_000, 30_000]);
  });

  it('keeps the rows read and returns timedOut with nextSearchFrom when the budget ends between pages', async () => {
    const { ctx, request, answer } = createContext();
    answer(99_500, endpoints(0, 100, 1000));
    const result = await runAction(ctx, 'getEndpoints', { maxResults: 300 });
    expect(request).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ pagesFetched: 1, nextSearchFrom: 100, timedOut: true });
    expect((result as { reply: { endpoints: unknown[] } }).reply.endpoints).toHaveLength(100);
  });

  it('ends the read with the rows already read when the budget cuts a request', async () => {
    const { ctx, request, answer } = createContext();
    answer(50_000, endpoints(0, 100, 1000));
    answer(50_000, timeoutError(), true);
    const result = await runAction(ctx, 'getEndpoints', { maxResults: 300 });
    expect(request.mock.calls[1][0].timeout).toBe(50_000);
    expect(result).toMatchObject({ pagesFetched: 1, nextSearchFrom: 100, timedOut: true });
  });

  it('does not wait for a retry that cannot start before the budget ends', async () => {
    const { ctx, request, answer } = createContext();
    answer(99_000, httpError(503), true);
    await expect(runAction(ctx, 'getPolicy', { endpointId: 'ep1' })).rejects.toThrow(
      "Cortex XDR answered HTTP 503 to /endpoints/get_policy and the action's 100 s time budget left no time to retry it."
    );
    expect(request).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('isolateEndpoint sends nothing when its endpoint lookup did not finish', async () => {
    const { ctx, request, answer } = createContext();
    answer(99_500, endpoints(0, 100, 150));
    const endpointIds = Array.from({ length: 150 }, (_, i) => `ep${i}`);
    await expect(runAction(ctx, 'isolateEndpoint', { endpointIds })).rejects.toThrow(
      "The endpoint lookup did not finish within the action's time budget, so nothing was sent to /endpoints/isolate."
    );
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0].url).toBe(`${BASE}/endpoints/get_endpoint`);
  });

  it('updateIssue stops before the budget ends and lists the issues it did not send', async () => {
    const { ctx, request, answer } = createContext();
    answer(99_500, ok('', 204));
    await expect(
      runAction(ctx, 'updateIssue', { issueIds: [1, 2, 3], status: 'In Progress' })
    ).resolves.toEqual({
      results: [{ issueId: 1, success: true }],
      succeeded: 1,
      failed: 0,
      timedOut: true,
      notAttempted: [2, 3],
    });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('updateIssue fails without a request when the budget is spent before the first issue', async () => {
    const { ctx, request } = createContext();
    remainingBudgetMs(ctx);
    clock = 99_500;
    await expect(
      runAction(ctx, 'updateIssue', { issueIds: [4, 5], status: 'New' })
    ).rejects.toThrow(
      "The action's time budget was spent before any issue was updated; not sent: 4, 5."
    );
    expect(request).not.toHaveBeenCalled();
  });

  it('getRetrievedFileDetails returns the listed files and skips the download once the budget is spent', async () => {
    const { ctx, request, answer } = createContext();
    answer(99_500, ok({ reply: { data: { ep1: `${BASE}/download/zip1` } } }));
    const result = await runAction(ctx, 'getRetrievedFileDetails', { actionId: 9, download: true });
    expect(request).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ready: true,
      files: [
        {
          endpointId: 'ep1',
          downloadRoute: '/download/zip1',
          downloaded: false,
          skippedReason: "not downloaded: the action's time budget is spent",
        },
      ],
    });
  });
});

describe('Cortex XDR whitespace ids', () => {
  it('rejects whitespace-only endpoint ids, hostnames and IP addresses before any request', () => {
    const { input: action } = CortexXdr.actions.scanEndpoint;
    const { input: list } = CortexXdr.actions.getEndpoints;
    expect(() => action.parse({ endpointIds: ['   '] })).toThrow();
    expect(() => list.parse({ hostnames: [' '] })).toThrow();
    expect(() => list.parse({ ipList: ['\t'] })).toThrow();
  });

  it('trims the ids it sends', () => {
    const { input } = CortexXdr.actions.scanEndpoint;
    expect(input.parse({ endpointIds: [' ep1 '] })).toMatchObject({ endpointIds: ['ep1'] });
  });
});

describe('Cortex XDR retrieved file details', () => {
  it('is ready only when every endpoint has a download route, and leaves the vendor links out of reply', async () => {
    const { ctx, answer } = createContext();
    answer(10, ok({ reply: { data: { ep1: `${BASE}/download/zip1`, ep2: null } } }));
    const result = await runAction(ctx, 'getRetrievedFileDetails', { actionId: 3 });
    expect(result).toMatchObject({ ready: false, reply: {} });
    expect((result as { reply: Record<string, unknown> }).reply).not.toHaveProperty('data');
  });
});
