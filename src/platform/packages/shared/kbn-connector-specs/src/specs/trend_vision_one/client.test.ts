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
import {
  buildFilter,
  budgetLeft,
  checkNextLink,
  getApiOrigin,
  getHeader,
  readQuota,
  startActionBudget,
  timers,
  vendorRequest,
  withoutDeprecated,
} from './client';
import { ACTION_BUDGET_MS, REQUEST_TIMEOUT_MS } from './constants';
import {
  API,
  ctx,
  ctxWith,
  httpError,
  ok,
  ORIGIN,
  request,
  resetMocksAroundEachTest,
  sent,
  vendorError,
} from './test_helpers';

resetMocksAroundEachTest();

describe('TrendAI Vision One region API URL', () => {
  it.each([
    ['https://api.in.xdr.trendmicro.com', 'https://api.in.xdr.trendmicro.com'],
    ['https://api.xdr.trendmicro.com/', 'https://api.xdr.trendmicro.com'],
    ['https://api.xdr.trendmicro.co.jp', 'https://api.xdr.trendmicro.co.jp'],
    ['  https://api.mea.xdr.trendmicro.com  ', 'https://api.mea.xdr.trendmicro.com'],
    [undefined, 'https://api.in.xdr.trendmicro.com'],
    ['', 'https://api.in.xdr.trendmicro.com'],
  ])('uses the origin of %j (plain URL parse, default India)', (apiUrl, origin) => {
    expect(getApiOrigin(ctxWith(apiUrl))).toBe(origin);
  });

  it.each([
    ['https://portal.in.xdr.trendmicro.com', 'https://api.in.xdr.trendmicro.com'],
    ['https://portal.xdr.trendmicro.com/index.html', 'https://api.xdr.trendmicro.com'],
    ['http://portal.in.xdr.trendmicro.com', 'https://api.in.xdr.trendmicro.com'],
  ])('refuses the console address %s first and names the https API address', (apiUrl, hint) => {
    expect(() => getApiOrigin(ctxWith(apiUrl))).toThrow(
      `TrendAI Vision One API URL looks like the console address (portal...). Use the API address instead, for example ${hint}.`
    );
  });

  it.each([
    'http://api.in.xdr.trendmicro.com',
    'http://api.xdr.trendmicro.com/',
    'ftp://api.in.xdr.trendmicro.com',
    'http://127.0.0.2:8080',
    'http://localhost.example.com',
  ])('refuses %s: the API key must not travel over plain http to a remote host', (apiUrl) => {
    expect(() => getApiOrigin(ctxWith(apiUrl))).toThrow(
      'TrendAI Vision One API URL must use https.'
    );
  });

  it.each([
    ['http://localhost:8080', 'http://localhost:8080'],
    ['http://127.0.0.1:9443/', 'http://127.0.0.1:9443'],
    ['http://[::1]:9443', 'http://[::1]:9443'],
  ])('allows plain http on the loopback host %s (local emulator)', (apiUrl, origin) => {
    expect(getApiOrigin(ctxWith(apiUrl))).toBe(origin);
  });

  it.each([
    ['https://api.in.xdr.trendmicro.com?region=in', 'must not have a query string (?...)'],
    ['https://api.in.xdr.trendmicro.com/?', 'must not have a query string (?...)'],
    ['https://api.in.xdr.trendmicro.com#top', 'must not have a fragment (#...)'],
    [
      'https://api.in.xdr.trendmicro.com/v3.0',
      'must not have a path (/v3.0); the connector adds /v3.0',
    ],
    ['https://api.in.xdr.trendmicro.com/v3.0/', 'must not have a path (/v3.0/)'],
  ])('refuses %s with a clear message', (apiUrl, message) => {
    expect(() => getApiOrigin(ctxWith(apiUrl))).toThrow(`TrendAI Vision One API URL ${message}`);
    expect(() => getApiOrigin(ctxWith(apiUrl))).toThrow(
      'Give only the API address, for example https://api.in.xdr.trendmicro.com.'
    );
  });

  it('refuses a value that is not a URL with the plain parse error', () => {
    expect(() => getApiOrigin(ctxWith('not a url'))).toThrow(
      'TrendAI Vision One API URL is not a valid URL: not a url'
    );
  });
});

describe('TrendAI Vision One requests and errors', () => {
  it('sends the request to the region API with a 60 s timeout and no empty params', async () => {
    request.mockResolvedValueOnce(ok({ status: 'available' }));
    await vendorRequest(ctx, {
      action: 'test',
      method: 'GET',
      path: '/healthcheck/connectivity',
      params: { top: 50, select: undefined, orderBy: '' },
      mutating: false,
    });
    expect(sent()).toEqual({
      method: 'GET',
      url: `${API}/healthcheck/connectivity`,
      params: { top: 50 },
      data: undefined,
      headers: undefined,
      timeout: 60_000,
    });
  });

  it.each([
    [400, 'TrendAI Vision One rejected the request (400): BadRequest: Invalid filter'],
    [401, 'failed (401): BadRequest: Invalid filter. Check the API key and that the region'],
    [403, "Grant the API key's role the permission listed for this action"],
    [404, 'Thing 1 not found (404)'],
    [412, 'the alert changed since it was read'],
    [413, 'the submission is too large'],
  ])('maps HTTP %s to a clear error without retrying', async (status, message) => {
    request.mockRejectedValue(httpError(status, vendorError('BadRequest', 'Invalid filter')));
    await expect(
      vendorRequest(ctx, {
        action: 'x',
        method: 'GET',
        path: '/x',
        mutating: false,
        notFound: 'Thing 1',
      })
    ).rejects.toThrow(message);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('keeps the HTTP status and response headers on the thrown error (429 with Retry-After)', async () => {
    request.mockRejectedValue(
      httpError(429, vendorError('TooManyRequests', 'slow down'), { 'retry-after': '20' })
    );
    const error = await vendorRequest(ctx, {
      action: 'x',
      method: 'POST',
      path: '/x',
      mutating: true,
      noRetry: () => true,
    }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      message:
        'TrendAI Vision One rate limit reached for x; try again later (TooManyRequests: slow down)',
      statusCode: 429,
      status: 429,
      headers: { 'retry-after': '20' },
    });
  });

  it.each([400, 401, 403, 404, 412, 413, 500, 503])(
    'keeps status %s and the headers on the error',
    async (status) => {
      request.mockRejectedValue(httpError(status, {}, { 'x-request-id': 'r1' }));
      const error = await vendorRequest(ctx, {
        action: 'x',
        method: 'POST',
        path: '/x',
        mutating: true,
      }).catch((caught: unknown) => caught);
      expect(error).toMatchObject({
        statusCode: status,
        status,
        headers: { 'x-request-id': 'r1' },
      });
    }
  );

  it('names the Kibana response size limit and the inputs that shrink a response that is too large', async () => {
    request.mockRejectedValue(
      Object.assign(new Error('maxContentLength size of 1048576 exceeded'), {
        isAxiosError: true,
        code: 'ERR_BAD_RESPONSE',
      })
    );
    await expect(
      vendorRequest(ctx, { action: 'listEndpoints', method: 'GET', path: '/x', mutating: false })
    ).rejects.toThrow(
      'TrendAI Vision One listEndpoints request failed: the response is larger than the Kibana limit (xpack.actions.maxResponseContentLength); ask for fewer items with a smaller top or fewer select fields'
    );
  });

  it('retries a read on 500 and 503 and succeeds on the third attempt', async () => {
    request
      .mockRejectedValueOnce(httpError(500))
      .mockRejectedValueOnce(httpError(503))
      .mockResolvedValueOnce(ok({ items: [] }));
    await vendorRequest(ctx, { action: 'x', method: 'GET', path: '/x', mutating: false });
    expect(request).toHaveBeenCalledTimes(3);
    expect(timers.sleep).toHaveBeenNthCalledWith(1, 0);
    expect(timers.sleep).toHaveBeenNthCalledWith(2, 2_000);
  });

  it('stops after three attempts with the rate limit message', async () => {
    request.mockRejectedValue(httpError(429, vendorError('TooManyRequests', 'slow down')));
    await expect(
      vendorRequest(ctx, { action: 'listAlerts', method: 'GET', path: '/x', mutating: false })
    ).rejects.toThrow('TrendAI Vision One rate limit reached for listAlerts; try again later');
    expect(request).toHaveBeenCalledTimes(3);
  });

  it('honours Retry-After and caps it at 30 s', async () => {
    request
      .mockRejectedValueOnce(httpError(429, {}, { 'retry-after': '7' }))
      .mockRejectedValueOnce(httpError(429, {}, { 'retry-after': '300' }))
      .mockResolvedValueOnce(ok({}));
    await vendorRequest(ctx, { action: 'x', method: 'POST', path: '/x', mutating: true });
    expect(timers.sleep).toHaveBeenNthCalledWith(1, 7_000);
    expect(timers.sleep).toHaveBeenNthCalledWith(2, 30_000);
  });

  it('never retries a state-changing call on 5xx', async () => {
    request.mockRejectedValue(httpError(500, vendorError('InternalServerError', 'boom')));
    await expect(
      vendorRequest(ctx, { action: 'isolateEndpoint', method: 'POST', path: '/x', mutating: true })
    ).rejects.toThrow('isolateEndpoint failed (500): InternalServerError: boom');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('does not retry when the caller marks the failure final', async () => {
    request.mockRejectedValue(httpError(429));
    await expect(
      vendorRequest(ctx, {
        action: 'x',
        method: 'POST',
        path: '/x',
        mutating: true,
        noRetry: () => true,
      })
    ).rejects.toThrow('rate limit reached');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('reports a timeout without a status', async () => {
    request.mockRejectedValue(
      Object.assign(new Error('timeout'), { isAxiosError: true, code: 'ECONNABORTED' })
    );
    await expect(
      vendorRequest(ctx, { action: 'x', method: 'GET', path: '/x', mutating: false })
    ).rejects.toThrow('request failed: timed out after 60 s');
  });

  it('states the same request timeout in the docs page as REQUEST_TIMEOUT_MS', () => {
    const docs = fs.readFileSync(
      join(REPO_ROOT, 'docs/reference/connectors-kibana/trend-vision-one-action-type.md'),
      'utf8'
    );
    expect(docs).toContain(`times out after ${REQUEST_TIMEOUT_MS / 1000} seconds`);
  });
});

describe('TrendAI Vision One nextLink check', () => {
  const path = '/workbench/alerts';

  it('accepts a link on the configured host and the action path', () => {
    const link = `${API}${path}?skipToken=abc`;
    expect(checkNextLink(ctx, link, path)).toBe(link);
  });

  it.each([
    ['another host', `https://evil.example${'/v3.0/workbench/alerts'}?skipToken=a`],
    ['a protocol-relative link', '//evil.example/v3.0/workbench/alerts?skipToken=a'],
    ['another region', 'https://api.xdr.trendmicro.com/v3.0/workbench/alerts?skipToken=a'],
    ['another path', `${ORIGIN}/v3.0/response/tasks?skipToken=a`],
    ['http on the same host', 'http://api.in.xdr.trendmicro.com/v3.0/workbench/alerts'],
  ])('refuses %s', (_label, link) => {
    expect(() => checkNextLink(ctx, link, path)).toThrow('nextLink must point to');
  });

  it('refuses a nextLink that is not a URL with its own message', () => {
    expect(() => checkNextLink(ctx, 'http://[not-a-host', path)).toThrow(
      'nextLink is not a valid URL'
    );
  });
});

describe('TrendAI Vision One helpers', () => {
  it('builds a TMV1-Filter with doubled single quotes and a wrapped expression', () => {
    expect(
      buildFilter(
        [
          ['endpointName', "o'brien-pc"],
          ['agentGuid', undefined],
        ],
        "osPlatform eq 'windows' or osPlatform eq 'linux'"
      )
    ).toBe("endpointName eq 'o''brien-pc' and (osPlatform eq 'windows' or osPlatform eq 'linux')");
    expect(buildFilter([], "riskLevel eq 'high'")).toBe("riskLevel eq 'high'");
    expect(buildFilter([['status', undefined]])).toBeUndefined();
  });

  it('trims filter values, drops blank ones and keeps interior whitespace', () => {
    expect(buildFilter([['endpointName', '   ']])).toBeUndefined();
    expect(buildFilter([['endpointName', ' \t']], '  ')).toBeUndefined();
    expect(buildFilter([['endpointName', '  lab-01  ']])).toBe("endpointName eq 'lab-01'");
    expect(
      buildFilter([
        ['endpointName', ' lab pc 01 '],
        ['agentGuid', ' '],
      ])
    ).toBe("endpointName eq 'lab pc 01'");
  });

  it('removes the deprecated investigationStatus field and keeps the rest', () => {
    expect(withoutDeprecated({ id: 'WB-1', investigationStatus: 'New', status: 'Open' })).toEqual({
      id: 'WB-1',
      status: 'Open',
    });
  });

  it('reads string and numeric header values, case-insensitively', () => {
    expect(getHeader(ok({}, { etag: '"e1"' }) as never, 'ETag')).toBe('"e1"');
    expect(getHeader({ ...ok({}), headers: { 'retry-after': 5 } } as never, 'Retry-After')).toBe(
      '5'
    );
    expect(
      getHeader({ ...ok({}), headers: { x: { nested: true } } } as never, 'x')
    ).toBeUndefined();
    expect(getHeader(undefined, 'etag')).toBeUndefined();
  });

  it('reads the submission quota headers', () => {
    expect(
      readQuota(
        ok(
          {},
          {
            'tmv1-submission-reserve-count': '1',
            'tmv1-submission-remaining-count': '99',
            'tmv1-submission-count': '1',
            'tmv1-submission-exemption-count': '0',
          }
        ) as never
      )
    ).toEqual({ reserveCount: 1, remainingCount: 99, count: 1, exemptionCount: 0 });
    expect(readQuota(ok({}) as never)).toEqual({
      reserveCount: null,
      remainingCount: null,
      count: null,
      exemptionCount: null,
    });
  });
});

describe('TrendAI Vision One action time budget', () => {
  const T0 = new Date('2026-11-20T00:00:00Z');
  beforeEach(() => {
    jest.useFakeTimers({ now: T0 });
    jest.spyOn(timers, 'sleep').mockImplementation(async (ms: number) => {
      jest.advanceTimersByTime(ms);
    });
  });
  afterEach(() => {
    jest.useRealTimers();
  });
  const read = () =>
    vendorRequest(ctx, { action: 'x', method: 'GET', path: '/x', mutating: false });
  const slow = (ms: number, outcome: () => unknown) => async () => {
    jest.advanceTimersByTime(ms);
    return outcome();
  };

  it('is 100 s, below the Kibana action limit, and has no limit before it is started', () => {
    expect(ACTION_BUDGET_MS).toBe(100_000);
    const fresh = { ...ctx };
    expect(budgetLeft(fresh)).toBe(Number.POSITIVE_INFINITY);
    startActionBudget(fresh);
    expect(budgetLeft(fresh)).toBe(100_000);
  });

  it('gives each request the remaining budget as its timeout and stops retrying when it is spent', async () => {
    startActionBudget(ctx);
    request.mockImplementation(
      slow(60_000, () => {
        throw httpError(503);
      })
    );
    await expect(read()).rejects.toThrow('(503)');
    expect(request).toHaveBeenCalledTimes(2);
    expect(sent(0).timeout).toBe(60_000);
    expect(sent(1).timeout).toBe(40_000);
  });

  it('does not wait for a Retry-After that passes the budget', async () => {
    startActionBudget(ctx);
    request.mockImplementation(
      slow(80_000, () => {
        throw httpError(429, {}, { 'retry-after': '30' });
      })
    );
    await expect(read()).rejects.toThrow('rate limit reached');
    expect(request).toHaveBeenCalledTimes(1);
    expect(timers.sleep).not.toHaveBeenCalled();
  });

  it('never starts a request once the budget is spent', async () => {
    startActionBudget(ctx);
    jest.advanceTimersByTime(100_000);
    await expect(read()).rejects.toThrow(
      'TrendAI Vision One x stopped: the 100 s time budget of one action run is spent'
    );
    expect(request).not.toHaveBeenCalled();
  });

  it('reports a request cut by the budget with the timeout it had', async () => {
    startActionBudget(ctx);
    jest.advanceTimersByTime(90_000);
    request.mockRejectedValueOnce(
      Object.assign(new Error('timeout'), { isAxiosError: true, code: 'ECONNABORTED' })
    );
    await expect(read()).rejects.toThrow('request failed: timed out after 10 s');
    expect(sent().timeout).toBe(10_000);
  });
});
