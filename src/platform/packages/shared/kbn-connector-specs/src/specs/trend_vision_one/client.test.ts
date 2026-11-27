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
  checkNextLink,
  getApiOrigin,
  getHeader,
  readQuota,
  vendorRequest,
  withoutDeprecated,
} from './client';
import { getFinitePositiveNumber, getHeaderValue } from '../../connector_utils';
import { REQUEST_TIMEOUT_MS } from './constants';
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
    [undefined, 'https://api.xdr.trendmicro.com'],
    ['', 'https://api.xdr.trendmicro.com'],
  ])('uses the origin of %j (plain URL parse, default United States)', (apiUrl, origin) => {
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
      maxRedirects: 0,
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
    }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      message:
        'TrendAI Vision One rate limit reached for x; try again later (TooManyRequests: slow down)',
      statusCode: 429,
      status: 429,
      headers: { 'retry-after': '20' },
      response: { status: 429, headers: { 'retry-after': '20' } },
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
        response: { status, headers: { 'x-request-id': 'r1' } },
      });
    }
  );

  it('keeps only the status and a copy of the headers on the error, never the request config with the key', async () => {
    request.mockRejectedValue(
      Object.assign(httpError(429, {}, { 'retry-after': '20' }), {
        config: { headers: { Authorization: 'Bearer unit-test-key' } },
        request: { headers: { Authorization: 'Bearer unit-test-key' } },
      })
    );
    const error = (await vendorRequest(ctx, {
      action: 'x',
      method: 'POST',
      path: '/x',
      mutating: true,
    }).catch((caught: unknown) => caught)) as Record<string, unknown>;
    expect(Object.keys(error.response as object).sort()).toEqual(['headers', 'status']);
    expect(error).not.toHaveProperty('config');
    expect(error).not.toHaveProperty('request');
    expect(JSON.stringify(error)).not.toContain('unit-test-key');
  });

  describe('read by the Kibana action executor', () => {
    // The same reads as x-pack/platform/plugins/shared/actions/server/lib/single_file_connectors/
    // generate_executor_function.ts: getHttpStatus (errorMeta.statusCode) and the Retry-After
    // part of getRetryDate, through error.response and error.request.res.
    interface AxiosLikeError {
      response?: { status?: unknown; headers?: unknown };
      request?: { res?: { headers?: unknown } };
    }
    const getErrorHeaderValue = (error: unknown, headerName: string): unknown => {
      const { response, request: req } = (error ?? {}) as AxiosLikeError;
      const value =
        getHeaderValue({ headers: response?.headers, headerName }) ??
        getHeaderValue({ headers: req?.res?.headers, headerName });
      return Array.isArray(value) ? value[0] : value;
    };
    const getHttpStatus = (error: unknown): number | undefined => {
      const status = (error as AxiosLikeError | undefined)?.response?.status;
      return typeof status === 'number' ? status : undefined;
    };
    const getRetryDate = (error: unknown): Date | undefined => {
      if (getHttpStatus(error) === undefined) return undefined;
      const retryAfter = getErrorHeaderValue(error, 'retry-after');
      if (typeof retryAfter === 'string' && retryAfter.trim() !== '') {
        const seconds = getFinitePositiveNumber(retryAfter.trim());
        if (seconds !== undefined) return new Date(Date.now() + seconds * 1000);
        const dateMs = Date.parse(retryAfter);
        if (!Number.isNaN(dateMs)) return new Date(Math.max(dateMs, Date.now()));
      }
      return undefined;
    };
    const executorResult = (error: unknown) => {
      const statusCode = getHttpStatus(error);
      const retry = getRetryDate(error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
        ...(statusCode !== undefined ? { errorMeta: { statusCode } } : {}),
        ...(retry ? { retry } : {}),
      };
    };
    const NOW = Date.parse('2026-11-24T10:00:00Z');

    it('keeps status 429 and the Retry-After time of a rate-limited action', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(NOW);
      request.mockRejectedValue(
        httpError(429, vendorError('TooManyRequests', 'slow down'), { 'Retry-After': '20' })
      );
      const error = await vendorRequest(ctx, {
        action: 'listAlerts',
        method: 'GET',
        path: '/x',
        mutating: false,
      }).catch((caught: unknown) => caught);
      expect(executorResult(error)).toEqual({
        status: 'error',
        message:
          'TrendAI Vision One rate limit reached for listAlerts; try again later (TooManyRequests: slow down)',
        errorMeta: { statusCode: 429 },
        retry: new Date(NOW + 20_000),
      });
    });

    it.each([400, 401, 403, 404, 412, 500, 503])(
      'keeps status %s as errorMeta.statusCode',
      async (status) => {
        request.mockRejectedValue(httpError(status));
        const error = await vendorRequest(ctx, {
          action: 'x',
          method: 'POST',
          path: '/x',
          mutating: true,
        }).catch((caught: unknown) => caught);
        expect(executorResult(error)).toMatchObject({ errorMeta: { statusCode: status } });
      }
    );
  });

  it.each([301, 302, 307, 308])(
    'does not follow a %s redirect: one request, maxRedirects 0, and the status in the error',
    async (status) => {
      request.mockRejectedValue(
        httpError(status, '', { location: 'https://other.example/v3.0/sandbox/files/analyze' })
      );
      const error = (await vendorRequest(ctx, {
        action: 'submitFileToSandbox',
        method: 'POST',
        path: '/sandbox/files/analyze',
        data: { archivePassword: 'secret' },
        mutating: true,
      }).catch((caught: unknown) => caught)) as Error & { response?: { status?: number } };
      expect(request).toHaveBeenCalledTimes(1);
      expect(sent()).toMatchObject({
        url: `${API}/sandbox/files/analyze`,
        maxRedirects: 0,
      });
      expect(error.message).toBe(
        `TrendAI Vision One submitFileToSandbox failed (${status}): no details`
      );
      expect(error.response?.status).toBe(status);
      // Only the original request was made: the body and the key never went to the Location host.
      for (const [config] of request.mock.calls) {
        expect(String(config.url)).not.toContain('other.example');
      }
    }
  );

  it('does not follow or retry a redirect of a read either', async () => {
    request.mockRejectedValue(httpError(301, '', { location: 'https://other.example/x' }));
    await expect(
      vendorRequest(ctx, { action: 'listAlerts', method: 'GET', path: '/x', mutating: false })
    ).rejects.toThrow('TrendAI Vision One listAlerts failed (301)');
    expect(request).toHaveBeenCalledTimes(1);
    expect(sent().maxRedirects).toBe(0);
  });

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

  it('tells the caller of listObservedAttackTechniques to narrow the time window or the filter', async () => {
    request.mockRejectedValue(
      Object.assign(new Error('maxContentLength size of 1048576 exceeded'), {
        isAxiosError: true,
        code: 'ERR_BAD_RESPONSE',
      })
    );
    const error = await vendorRequest(ctx, {
      action: 'listObservedAttackTechniques',
      method: 'GET',
      path: '/x',
      mutating: false,
    }).catch((e: Error) => e);
    expect((error as Error).message).toContain('narrow the time window or the filter');
    expect((error as Error).message).not.toContain('smaller top');
    expect((error as Error).message).not.toContain('select');
  });

  it('never retries a state-changing call on 5xx', async () => {
    request.mockRejectedValue(httpError(500, vendorError('InternalServerError', 'boom')));
    await expect(
      vendorRequest(ctx, { action: 'isolateEndpoint', method: 'POST', path: '/x', mutating: true })
    ).rejects.toThrow('isolateEndpoint failed (500): InternalServerError: boom');
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
