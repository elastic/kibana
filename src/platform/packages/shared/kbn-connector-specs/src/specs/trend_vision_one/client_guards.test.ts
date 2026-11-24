/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  apiUrlProblem,
  checkNextLink,
  filterHeader,
  getApiOrigin,
  normaliseLink,
  safeDecode,
  timers,
  vendorRequest,
} from './client';
import {
  API,
  ctx,
  ctxWith,
  httpError,
  ok,
  request,
  resetMocksAroundEachTest,
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

describe('TrendAI Vision One safe decoding and link normalising', () => {
  it('decodes a valid value and returns a malformed one as it is', () => {
    expect(safeDecode('a%20b')).toBe('a b');
    expect(safeDecode('%E0%A4%A')).toBe('%E0%A4%A');
  });

  it('puts the same cursor in one form: absolute, sorted query, no fragment', () => {
    expect(normaliseLink(ctx, '/v3.0/x?b=2&a=1#frag')).toBe(`${API}/x?a=1&b=2`);
  });
});
