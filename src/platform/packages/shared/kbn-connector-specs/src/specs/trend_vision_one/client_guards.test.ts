/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFinitePositiveNumber, getHeaderValue } from '../../connector_utils';
import {
  apiUrlProblem,
  checkNextLink,
  filterHeader,
  getApiOrigin,
  normaliseLink,
  decodedId,
  timers,
  vendorRequest,
} from './client';
import { taskIdFrom } from './multi_status';
import { GetTaskInputSchema } from './response_types';
import {
  API,
  ctx,
  ctxWith,
  httpError,
  ok,
  request,
  resetMocksAroundEachTest,
  run,
  vendorError,
} from './test_helpers';

resetMocksAroundEachTest();

describe('TrendAI Vision One Retry-After and failed writes', () => {
  it.each([
    ['a read', false],
    ['a state-changing call', true],
  ])(
    'stops and reports the last answer when Retry-After is above the cap, for %s (no early retry)',
    async (_what, mutating) => {
      request.mockRejectedValue(
        httpError(429, vendorError('TooManyRequests', 'slow down'), { 'retry-after': '120' })
      );
      const error = await vendorRequest(ctx, {
        action: 'listAlerts',
        method: mutating ? 'POST' : 'GET',
        path: '/x',
        mutating,
      }).catch((caught: Error & { response?: { headers: Record<string, string> } }) => caught);
      expect((error as Error).message).toContain('rate limit reached for listAlerts');
      expect((error as Error).message).not.toContain('may already have been applied');
      // The error keeps Retry-After so the caller can wait properly.
      expect((error as { response?: { headers: unknown } }).response?.headers).toEqual({
        'retry-after': '120',
      });
      expect(request).toHaveBeenCalledTimes(1);
      expect(timers.sleep).not.toHaveBeenCalled();
    }
  );

  it.each([[''], ['   '], ['soon'], ['-5']])(
    'uses the normal back-off, never an immediate retry, for Retry-After %j',
    async (retryAfter) => {
      request
        .mockRejectedValueOnce(httpError(503, {}, { 'retry-after': retryAfter }))
        .mockRejectedValueOnce(httpError(503, {}, { 'retry-after': retryAfter }))
        .mockResolvedValueOnce(ok({}));
      await vendorRequest(ctx, { action: 'x', method: 'GET', path: '/x', mutating: false });
      expect(timers.sleep).toHaveBeenNthCalledWith(1, 2_000);
      expect(timers.sleep).toHaveBeenNthCalledWith(2, 5_000);
    }
  );

  it('uses the normal back-off for a 429 without Retry-After', async () => {
    request.mockRejectedValueOnce(httpError(429)).mockResolvedValueOnce(ok({}));
    await vendorRequest(ctx, { action: 'x', method: 'POST', path: '/x', mutating: true });
    expect(timers.sleep).toHaveBeenCalledTimes(1);
    expect(timers.sleep).toHaveBeenCalledWith(2_000);
  });

  const mutate = (action = 'addAlertNote') =>
    vendorRequest(ctx, { action, method: 'POST', path: '/x', mutating: true });

  it.each([
    [
      'a timeout',
      () => Object.assign(new Error('timeout'), { isAxiosError: true, code: 'ECONNABORTED' }),
      'TrendAI Vision One addAlertNote request failed: timed out after 60 s. The change may already have been applied; check before repeating it.',
    ],
    [
      'a connection reset',
      () => Object.assign(new Error('socket hang up'), { isAxiosError: true, code: 'ECONNRESET' }),
      'TrendAI Vision One addAlertNote request failed: socket hang up. The change may already have been applied; check before repeating it.',
    ],
    [
      'a 503',
      () => httpError(503, vendorError('ServiceUnavailable', 'down')),
      'TrendAI Vision One addAlertNote failed (503): ServiceUnavailable: down. The change may already have been applied; check before repeating it.',
    ],
  ])(
    'says the change may already have been applied after %s on a write',
    async (_what, make, message) => {
      request.mockRejectedValue(make());
      await expect(mutate()).rejects.toThrow(new Error(message));
      expect(request).toHaveBeenCalledTimes(1);
    }
  );

  it.each([
    ['a 400', httpError(400, vendorError('BadRequest', 'no'))],
    ['a 404', httpError(404)],
    ['a 412', httpError(412)],
    ['a 429 after the last attempt', httpError(429)],
  ])('adds no "may already have been applied" hint after %s on a write', async (_what, failure) => {
    request.mockRejectedValue(failure);
    const error = await mutate().catch((caught: Error) => caught);
    expect((error as Error).message).not.toContain('may already have been applied');
  });

  it('adds no hint to a failed read or to a non-HTTP error', async () => {
    request.mockRejectedValue(
      Object.assign(new Error('timeout'), { isAxiosError: true, code: 'ECONNABORTED' })
    );
    const read = await vendorRequest(ctx, {
      action: 'x',
      method: 'GET',
      path: '/x',
      mutating: false,
    }).catch((caught: Error) => caught);
    expect((read as Error).message).toBe(
      'TrendAI Vision One x request failed: timed out after 60 s'
    );
    request.mockRejectedValue(new Error('Host is not allowed'));
    await expect(mutate()).rejects.toThrow(new Error('Host is not allowed'));
  });
});

describe('TrendAI Vision One credentials in a URL', () => {
  it.each([
    'https://user:secret@api.in.xdr.trendmicro.com',
    'https://user@api.in.xdr.trendmicro.com',
    'https://:secret@api.in.xdr.trendmicro.com',
  ])('refuses apiUrl %s with a user name or password', (apiUrl) => {
    expect(apiUrlProblem(apiUrl)).toBe(
      'TrendAI Vision One API URL must not contain a user name or password. Give only the API address, for example https://api.in.xdr.trendmicro.com.'
    );
    expect(() => getApiOrigin(ctxWith(apiUrl))).toThrow('must not contain a user name or password');
  });

  it.each([
    `https://u:p@api.in.xdr.trendmicro.com/v3.0/workbench/alerts?skipToken=1`,
    `https://u@api.in.xdr.trendmicro.com/v3.0/workbench/alerts?skipToken=1`,
  ])('refuses the nextLink %s with a user name or password', (link) => {
    expect(() => checkNextLink(ctx, link, '/workbench/alerts')).toThrow(
      'nextLink must not contain a user name or password'
    );
  });
});

describe('TrendAI Vision One nextLink page size', () => {
  const path = '/endpointSecurity/endpoints';
  const link = (query: string) => `${API}${path}${query}`;

  it.each(['?top=201', '?top=1000', '?skipToken=1&top=500', '?top=abc', '?top=10&top=1000'])(
    'refuses %s above the cap of 200',
    (query) => {
      expect(() => checkNextLink(ctx, link(query), path, 200)).toThrow(
        'nextLink asks for a page size'
      );
    }
  );

  it.each(['', '?skipToken=1', '?top=200', '?top=10&skipToken=2'])(
    'accepts %j (no top, or top within the cap)',
    (query) => {
      expect(checkNextLink(ctx, link(query), path, 200)).toBe(link(query));
    }
  );

  it('does not limit top when the action gives no cap', () => {
    expect(checkNextLink(ctx, link('?top=1000'), path)).toBe(link('?top=1000'));
  });
});

describe('TrendAI Vision One filter header characters', () => {
  it.each(["endpointName eq 'PC1東京'", '\u0100', 'a\ud83d\ude00'])(
    'refuses %j: the HTTP client would silently remove those characters',
    (filter) => {
      expect(() => filterHeader(filter)).toThrow('characters above U+00FF');
    }
  );

  it('sends characters up to U+00FF and ASCII unchanged', () => {
    expect(filterHeader("endpointName eq 'café'")).toEqual({
      'TMV1-Filter': "endpointName eq 'café'",
    });
    expect(filterHeader(undefined)).toBeUndefined();
  });
});

describe('TrendAI Vision One id decoding and link normalising', () => {
  it('decodes a valid id and returns null for a malformed or unusable one', () => {
    expect(decodedId('n%2D7')).toBe('n-7');
    expect(decodedId('%E0%A4%A')).toBeNull();
    expect(decodedId('a%20b')).toBeNull();
  });

  it('puts the same cursor in one form: absolute, sorted query, no fragment', () => {
    expect(normaliseLink(ctx, '/v3.0/x?b=2&a=1#frag')).toBe(`${API}/x?a=1&b=2`);
  });
});

describe('TrendAI Vision One headers on a failed write, as the Kibana executor reads them', () => {
  // Replicates generate_executor_function.ts: getHttpStatus and the Retry-After part of getRetryDate
  // (a retry date is returned for any HTTP error that carries Retry-After).
  interface AxiosLikeError {
    response?: { status?: unknown; headers?: unknown };
  }
  const retryDate = (error: unknown): Date | undefined => {
    const { response } = (error ?? {}) as AxiosLikeError;
    if (typeof response?.status !== 'number') return undefined;
    const value = getHeaderValue({ headers: response.headers, headerName: 'retry-after' });
    const retryAfter = Array.isArray(value) ? value[0] : value;
    if (typeof retryAfter === 'string' && retryAfter.trim() !== '') {
      const seconds = getFinitePositiveNumber(retryAfter.trim());
      if (seconds !== undefined) return new Date(Date.now() + seconds * 1000);
    }
    return undefined;
  };
  const failure = (mutating: boolean, failed: unknown) => {
    request.mockRejectedValue(failed);
    return vendorRequest(ctx, {
      action: 'x',
      method: mutating ? 'POST' : 'GET',
      path: '/x',
      mutating,
    }).catch((caught: unknown) => caught);
  };

  it.each([
    ['read 429 with Retry-After', false, 429, true],
    ['read 503 with Retry-After', false, 503, true],
    ['write 429 with Retry-After', true, 429, true],
    ['write 503 with Retry-After', true, 503, false],
    ['write 500 with Retry-After', true, 500, false],
  ])('%s: retry date %s', async (_what, mutating, status, expectRetry) => {
    // A single attempt: a Retry-After above the cap is reported instead of waited for.
    const error = await failure(mutating, httpError(status, {}, { 'Retry-After': '120' }));
    expect(retryDate(error) !== undefined).toBe(expectRetry);
    expect((error as { response: { status: number } }).response.status).toBe(status);
    expect((error as { status: number }).status).toBe(status);
    if (!expectRetry) {
      expect((error as { response: object }).response).toEqual({ status });
      expect(error).not.toHaveProperty('headers');
    }
  });

  it('gives no retry date for a write 500 without headers or a write without a response', async () => {
    expect(retryDate(await failure(true, httpError(500)))).toBeUndefined();
    const timeout = await failure(
      true,
      Object.assign(new Error('timeout'), { isAxiosError: true, code: 'ECONNABORTED' })
    );
    expect(retryDate(timeout)).toBeUndefined();
  });

  it('keeps the messages of a write 503 unchanged', async () => {
    const error = await failure(
      true,
      httpError(503, vendorError('Busy', 'later'), { 'retry-after': '5' })
    );
    expect((error as Error).message).toBe(
      'TrendAI Vision One x failed (503): Busy: later. The change may already have been applied; check before repeating it.'
    );
  });
});

describe('TrendAI Vision One ids read from Location headers', () => {
  const opLocation = (value: string) => ({ headers: [{ name: 'Operation-Location', value }] });

  it.each([
    ['https://api.xdr.trendmicro.com/v3.0/response/tasks/%E0%A4%A', null],
    ['/v3.0/response/tasks/%', null],
    ['/v3.0/response/tasks/a%2Fb', null],
    ['/v3.0/response/tasks/a%20b', null],
    ['/v3.0/response/tasks/' + 'a'.repeat(37), null],
    ['/v3.0/response/tasks/00000012', '00000012'],
    ['/v3.0/response/tasks/RM%2D1', 'RM-1'],
  ])('taskIdFrom %s gives %j', (value, id) => {
    expect(taskIdFrom(opLocation(value))).toBe(id);
  });

  it('only gives ids that getResponseTaskStatus accepts', () => {
    const samples = [
      'https://api.xdr.trendmicro.com/v3.0/response/tasks/00000012',
      '/v3.0/response/tasks/00000012?x=1',
      '/v3.0/response/tasks/RM%2D1',
      '/v3.0/response/tasks/%E0%A4%A',
      '/v3.0/response/tasks/a%2Fb',
      '/v3.0/response/tasks/a%20b',
      '/v3.0/response/tasks/%20',
      '/v3.0/response/tasks/',
      '',
      '/',
      'tasks',
      'https://api.xdr.trendmicro.com',
      '/v3.0/response/tasks/\u3000',
      '/v3.0/response/tasks/%E6%9D%B1',
    ];
    for (const value of samples) {
      const id = taskIdFrom(opLocation(value));
      if (id !== null) {
        expect(GetTaskInputSchema.safeParse({ id }).success).toBe(true);
      }
    }
  });

  it.each([
    ['7', '7'],
    ['n%2D7', 'n-7'],
    ['%E0%A4%A', null],
    ['a%2Fb', null],
    ['a%20b', null],
  ])(
    'addAlertNote reads the note id %s as %j and the write stays a success',
    async (segment, noteId) => {
      request.mockResolvedValueOnce(
        ok(undefined, { location: `${API}/workbench/alerts/WB-1/notes/${segment}` }, 201)
      );
      await expect(run('addAlertNote', { alertId: 'WB-1', content: 'c' })).resolves.toEqual({
        alertId: 'WB-1',
        noteId,
      });
    }
  );
});
