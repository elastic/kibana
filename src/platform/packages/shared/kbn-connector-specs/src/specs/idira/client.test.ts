/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import {
  IdiraApiError,
  articleFor,
  REQUEST_TIMEOUT_MS,
  buildAccountsFilter,
  getApiUrl,
  idiraPage,
  idiraRequest,
  isSecureApiUrl,
  MAX_ATTEMPTS,
  MAX_TOTAL_RETRY_WAIT_MS,
  nextOffsetFrom,
  parseRetryAfter,
  pathSegment,
  requestTimeout,
  retryDelay,
  retryTiming,
} from './client';
import type { IdiraRequestOptions } from './client';

const API_URL = 'https://acme.privilegecloud.cyberark.cloud';

const httpError = (status: number, data: unknown = {}, headers: Record<string, string> = {}) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data, headers, statusText: '' },
  });

const createContext = (config: Record<string, unknown> = { apiUrl: API_URL }) => {
  const request = jest.fn();
  const ctx = {
    client: { request },
    config,
    secrets: {
      authType: 'oauth_client_credentials',
      tokenUrl: 'https://abc1234.id.cyberark.cloud/oauth2/platformtoken',
      clientId: 'svc-kibana@acme',
      clientSecret: 'client-secret',
    },
    log: { debug: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  } as unknown as ActionContext;
  return { ctx, request };
};

const get = (overrides: Partial<IdiraRequestOptions> = {}): IdiraRequestOptions => ({
  method: 'GET',
  path: '/Accounts/12_3',
  permission: 'the List accounts permission on the safe',
  target: 'account 12_3',
  ...overrides,
});

describe('Idira client', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('articleFor', () => {
    it.each([
      ['id', 'an'],
      ['Activities', 'an'],
      ['offset', 'an'],
      ['Users', 'a'],
      ['user', 'a'],
      ['unique', 'a'],
      ['value', 'a'],
      ['LiveSessions', 'a'],
      ['memberName', 'a'],
    ])('%s takes "%s"', (word, article) => {
      expect(articleFor(word)).toBe(article);
    });
  });

  describe('getApiUrl', () => {
    it.each([
      [API_URL, API_URL],
      [`${API_URL}/`, API_URL],
      [`${API_URL}/PasswordVault`, API_URL],
      [`${API_URL}/PasswordVault/API/`, API_URL],
      [`${API_URL}/passwordvault/api`, API_URL],
      ['  https://acme.privilegecloud.cyberark.com  ', 'https://acme.privilegecloud.cyberark.com'],
      ['http://localhost:18080', 'http://localhost:18080'],
    ])('normalizes %s to %s', (configured, expected) => {
      const { ctx } = createContext({ apiUrl: configured });
      expect(getApiUrl(ctx)).toBe(expected);
    });

    it('throws when the URL is missing', () => {
      const { ctx } = createContext({});
      expect(() => getApiUrl(ctx)).toThrow('missing the Privilege Cloud URL');
    });

    it('refuses plain http to a remote host, because the token would travel in clear text', () => {
      const { ctx } = createContext({ apiUrl: 'http://acme.privilegecloud.cyberark.cloud' });
      expect(() => getApiUrl(ctx)).toThrow('must use https');
    });

    it.each([
      ['http://abc1234.id.cyberark.cloud/oauth2/platformtoken', false],
      ['https://abc1234.id.cyberark.cloud/oauth2/platformtoken', true],
      ['http://localhost:18080/oauth2/platformtoken', true],
    ])('token URL %s is accepted: %s', (tokenUrl, accepted) => {
      const { ctx } = createContext();
      (ctx.secrets as Record<string, unknown>).tokenUrl = tokenUrl;
      if (accepted) {
        expect(getApiUrl(ctx)).toBe(API_URL);
      } else {
        expect(() => getApiUrl(ctx)).toThrow('The token URL must use https');
      }
    });

    it.each([`${API_URL}/?tenant=acme`, `${API_URL}/#portal`, `${API_URL}?`])(
      'refuses %s, because the action path would land outside the URL path',
      async (apiUrl) => {
        const { ctx, request } = createContext({ apiUrl });
        expect(() => getApiUrl(ctx)).toThrow('cannot contain a query string (?) or a fragment (#)');
        await expect(idiraRequest(ctx, get())).rejects.toThrow('cannot contain a query string');
        expect(request).not.toHaveBeenCalled();
      }
    );

    it('sends no request when the token URL is plain http to a remote host', async () => {
      const { ctx, request } = createContext();
      (ctx.secrets as Record<string, unknown>).tokenUrl = 'http://abc1234.id.cyberark.cloud/token';
      await expect(idiraRequest(ctx, get())).rejects.toThrow('The token URL must use https');
      expect(request).not.toHaveBeenCalled();
    });
  });

  describe('isSecureApiUrl', () => {
    it.each([
      ['https://acme.privilegecloud.cyberark.cloud', true],
      ['http://localhost:18080', true],
      ['http://127.0.0.1:18080', true],
      ['http://acme.privilegecloud.cyberark.cloud', false],
      ['http://10.0.0.5', false],
      // Not a URL: left to the URL schema, which rejects it with its own message.
      ['not a url', true],
    ])('%s -> %s', (url, expected) => {
      expect(isSecureApiUrl(url)).toBe(expected);
    });
  });

  describe('idiraRequest', () => {
    it('sends the request under /PasswordVault/API with a timeout and no redirects', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { id: '12_3' } });

      await expect(idiraRequest(ctx, get({ params: { limit: 1 } }))).resolves.toEqual({
        status: 200,
        data: { id: '12_3' },
      });
      expect(request).toHaveBeenCalledWith({
        method: 'GET',
        url: `${API_URL}/PasswordVault/API/Accounts/12_3`,
        params: { limit: 1 },
        data: undefined,
        timeout: REQUEST_TIMEOUT_MS,
        maxRedirects: 0,
      });
    });

    describe('retries a 429 with backoff', () => {
      let sleep: jest.SpyInstance;
      beforeEach(() => {
        sleep = jest.spyOn(retryTiming, 'sleep').mockResolvedValue(undefined);
      });

      const tooMany = (headers: Record<string, string> = {}) =>
        httpError(
          429,
          { ErrorCode: 'TOO_MANY_REQUESTS', ErrorMessage: 'Too many requests' },
          headers
        );

      it('retries after the Retry-After wait and returns the next answer', async () => {
        const { ctx, request } = createContext();
        request
          .mockRejectedValueOnce(tooMany({ 'retry-after': '7' }))
          .mockResolvedValueOnce({ status: 200, data: { id: '12_3' } });

        await expect(idiraRequest(ctx, get())).resolves.toEqual({
          status: 200,
          data: { id: '12_3' },
        });
        expect(request).toHaveBeenCalledTimes(2);
        expect(sleep).toHaveBeenCalledWith(7_000);
        expect(ctx.log.debug).toHaveBeenCalledWith(
          'Privilege Cloud GET /PasswordVault/API/Accounts/12_3 answered 429; retrying in 7000 ms (attempt 2 of 4)'
        );
      });

      it('backs off 1 s, 2 s, then 4 s without a Retry-After and fails after 4 attempts', async () => {
        const { ctx, request } = createContext();
        request.mockRejectedValue(tooMany());

        const error = await idiraRequest(ctx, get()).catch((e) => e);
        expect(error).toBeInstanceOf(IdiraApiError);
        expect(error.status).toBe(429);
        expect(error.message).toBe(
          'Rate limited by Privilege Cloud on GET /PasswordVault/API/Accounts/12_3 (HTTP 429 TOO_MANY_REQUESTS: Too many requests). Still rate limited after 4 attempts. Wait, then run the action again.'
        );
        expect(request).toHaveBeenCalledTimes(MAX_ATTEMPTS);
        expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([1_000, 2_000, 4_000]);
      });

      it('stops when the next wait would pass the total cap, and reports the Retry-After', async () => {
        const { ctx, request } = createContext();
        request.mockRejectedValue(tooMany({ 'retry-after': '20' }));

        const error = await idiraRequest(ctx, get()).catch((e) => e);
        expect(error.message).toBe(
          'Rate limited by Privilege Cloud on GET /PasswordVault/API/Accounts/12_3 (HTTP 429 TOO_MANY_REQUESTS: Too many requests). Still rate limited after 2 attempts. Privilege Cloud asks to wait 20 s before the next request (Retry-After).'
        );
        expect(request).toHaveBeenCalledTimes(2);
        expect(sleep).toHaveBeenCalledTimes(1);
      });

      it('does not retry when the first Retry-After is longer than the cap', async () => {
        const { ctx, request } = createContext();
        const inNinetySeconds = new Date(Date.now() + 90_000).toUTCString();
        request.mockRejectedValue(tooMany({ 'retry-after': inNinetySeconds }));

        const error = await idiraRequest(ctx, get()).catch((e) => e);
        expect(error.message).toContain(
          `The connector did not retry, because the wait is longer than the ${
            MAX_TOTAL_RETRY_WAIT_MS / 1000
          } s it waits per call.`
        );
        expect(error.message).toMatch(/asks to wait (89|90) s before the next request/);
        expect(request).toHaveBeenCalledTimes(1);
        expect(sleep).not.toHaveBeenCalled();
      });

      it('retries a rate-limited write too, because it was not processed', async () => {
        const { ctx, request } = createContext();
        request
          .mockRejectedValueOnce(tooMany({ 'retry-after': '3' }))
          .mockResolvedValueOnce({ status: 200, data: '' });

        await expect(
          idiraRequest(ctx, get({ method: 'POST', path: '/Accounts/12_3/Change' }))
        ).resolves.toEqual({ status: 200, data: '' });
        expect(request).toHaveBeenCalledTimes(2);
        expect(sleep).toHaveBeenCalledWith(3_000);
      });

      it.each([
        [1, undefined, 1_000],
        [2, undefined, 2_000],
        [3, undefined, 4_000],
        [1, '5', 5_000],
        [3, '0', 0],
      ])('retryDelay(attempt %p, Retry-After %p) is %p ms', (attempt, header, delay) => {
        expect(retryDelay(header, attempt)).toBe(delay);
      });
    });

    describe('every other error is sent once', () => {
      it.each([500, 502, 503, 504])(
        'fails a %s on a GET after one request, without a may-have-applied note',
        async (status) => {
          const { ctx, request } = createContext();
          request.mockRejectedValue(httpError(status, { ErrorMessage: 'Service unavailable' }));

          const error = await idiraRequest(ctx, get()).catch((e) => e);
          expect(error.message).toBe(
            `Privilege Cloud error ${status} on GET /PasswordVault/API/Accounts/12_3 (HTTP ${status}: Service unavailable).`
          );
          expect(request).toHaveBeenCalledTimes(1);
        }
      );

      it('reports the Retry-After of a 503', async () => {
        const { ctx, request } = createContext();
        request.mockRejectedValue(httpError(503, {}, { 'retry-after': '120' }));

        await expect(idiraRequest(ctx, get())).rejects.toThrow(
          'Privilege Cloud asks to wait 120 s before the next request (Retry-After).'
        );
      });

      it.each(['POST', 'PATCH', 'DELETE'] as const)(
        'says a %s that got a 5xx may have been applied, and does not resend it',
        async (method) => {
          const { ctx, request } = createContext();
          request.mockRejectedValue(httpError(503, { ErrorMessage: 'Service unavailable' }));

          const error = await idiraRequest(ctx, get({ method })).catch((e) => e);
          expect(error.message).toBe(
            `Privilege Cloud error 503 on ${method} /PasswordVault/API/Accounts/12_3 (HTTP 503: Service unavailable). Privilege Cloud may have applied the change: check the current state before you run the action again.`
          );
          expect(request).toHaveBeenCalledTimes(1);
        }
      );

      it.each([
        [
          'a timeout',
          Object.assign(new Error('timeout of 30000ms exceeded'), {
            isAxiosError: true,
            code: 'ECONNABORTED',
          }),
        ],
        [
          'a connection reset after sending',
          Object.assign(new Error('socket hang up'), { isAxiosError: true, code: 'ECONNRESET' }),
        ],
      ])('says a write cut by %s may have been applied', async (_name, failure) => {
        const { ctx, request } = createContext();
        request.mockRejectedValue(failure);

        const error = await idiraRequest(
          ctx,
          get({ method: 'POST', path: '/Accounts/12_3/Change' })
        ).catch((e) => e);
        expect(error.message).toContain(
          'Privilege Cloud request POST /PasswordVault/API/Accounts/12_3/Change failed: '
        );
        expect(error.message).toContain('Privilege Cloud may have applied the change');
        expect(request).toHaveBeenCalledTimes(1);
      });

      it('does not say a write was applied when the connection was refused', async () => {
        const { ctx, request } = createContext();
        request.mockRejectedValue(
          Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:443'), {
            isAxiosError: true,
            code: 'ECONNREFUSED',
          })
        );

        const error = await idiraRequest(ctx, get({ method: 'POST' })).catch((e) => e);
        expect(error.message).toBe(
          'Privilege Cloud request POST /PasswordVault/API/Accounts/12_3 failed: connect ECONNREFUSED 127.0.0.1:443.'
        );
      });

      it('does not add the may-have-applied note to a read that timed out', async () => {
        const { ctx, request } = createContext();
        request.mockRejectedValue(
          Object.assign(new Error('timeout of 30000ms exceeded'), {
            isAxiosError: true,
            code: 'ECONNABORTED',
          })
        );

        const error = await idiraRequest(ctx, get()).catch((e) => e);
        expect(error.message).toBe(
          'Privilege Cloud request GET /PasswordVault/API/Accounts/12_3 failed: timeout of 30000ms exceeded.'
        );
      });
    });

    describe('request timeout', () => {
      const withConfiguredTimeout = (timeout: number | undefined) => {
        const { ctx, request } = createContext();
        Object.assign(ctx.client, { defaults: { timeout } });
        request.mockResolvedValue({ status: 200, data: {} });
        return { ctx, request };
      };

      it('uses the configured Actions timeout when it is lower', async () => {
        const { ctx, request } = withConfiguredTimeout(10_000);
        await idiraRequest(ctx, get());
        expect(requestTimeout(ctx)).toBe(10_000);
        expect(request.mock.calls[0][0].timeout).toBe(10_000);
      });

      it('keeps its own 30 s timeout when the configured one is higher', async () => {
        const { ctx, request } = withConfiguredTimeout(120_000);
        await idiraRequest(ctx, get());
        expect(request.mock.calls[0][0].timeout).toBe(REQUEST_TIMEOUT_MS);
      });

      it.each([undefined, 0])('keeps its own timeout when the configured one is %p', (value) => {
        const { ctx } = withConfiguredTimeout(value);
        expect(requestTimeout(ctx)).toBe(REQUEST_TIMEOUT_MS);
      });
    });

    it.each([
      [
        400,
        'Privilege Cloud rejected the request GET /PasswordVault/API/Accounts/12_3 (HTTP 400 PASWS001E: Invalid request).',
      ],
      [
        401,
        'Authentication failed for GET /PasswordVault/API/Accounts/12_3 (HTTP 401 PASWS001E: Invalid request). Check the token URL',
      ],
      [
        403,
        'Forbidden: GET /PasswordVault/API/Accounts/12_3 (HTTP 403 PASWS001E: Invalid request). The service user lacks the List accounts permission on the safe.',
      ],
      [404, 'Not found: account 12_3 (HTTP 404 PASWS001E: Invalid request).'],
      [409, 'Already exists: account 12_3 (HTTP 409 PASWS001E: Invalid request).'],
    ])('maps a %s after one request', async (status, message) => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(
        httpError(status, { ErrorCode: 'PASWS001E', ErrorMessage: 'Invalid request' })
      );

      const error = await idiraRequest(ctx, get()).catch((e) => e);
      expect(error).toBeInstanceOf(IdiraApiError);
      expect(error.message).toContain(message);
      expect(error.status).toBe(status);
      expect(error.code).toBe('PASWS001E');
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('gives 401 and 403 different explanations', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValueOnce(httpError(401)).mockRejectedValueOnce(httpError(403));

      const unauthorized = await idiraRequest(ctx, get()).catch((e) => e);
      const forbidden = await idiraRequest(ctx, get()).catch((e) => e);
      expect(unauthorized.message).toContain('client secret');
      expect(unauthorized.message).not.toContain('lacks');
      expect(forbidden.message).toContain('lacks the List accounts permission');
      expect(forbidden.message).not.toContain('client secret');
    });

    it('adds the access hint to a 403 and a 404', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(404));

      await expect(idiraRequest(ctx, get({ accessHint: 'Managed in Identity.' }))).rejects.toThrow(
        'Managed in Identity.'
      );
    });

    it('never quotes a secret the call sent, even when the vendor echoes it', async () => {
      const { ctx, request } = createContext();
      const secret = 'Canary-Pa55-7f3e';
      request.mockRejectedValue(
        httpError(400, {
          ErrorCode: 'PASWS013E',
          ErrorMessage: `Password ${secret} does not meet the policy`,
        })
      );

      const error = await idiraRequest(
        ctx,
        get({ method: 'POST', data: { NewCredentials: secret }, redact: [secret] })
      ).catch((e) => e);
      expect(error.message).toContain('[REDACTED] does not meet the policy');
      expect(error.message).not.toContain(secret);
      expect(JSON.stringify(error)).not.toContain(secret);
    });

    it('explains a response cut at the maximum response size instead of a network failure', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(
        Object.assign(new Error('maxContentLength size of 1048576 exceeded'), {
          isAxiosError: true,
          code: 'ERR_BAD_RESPONSE',
        })
      );

      const error = await idiraRequest(ctx, get({ path: '/Accounts' })).catch((e) => e);
      expect(error).toBeInstanceOf(IdiraApiError);
      expect(error.message).toBe(
        'Privilege Cloud request GET /PasswordVault/API/Accounts failed. The response is larger than the xpack.actions.maxResponseContentLength setting allows. Request a smaller page with a lower limit (or narrow the search), or raise the setting.'
      );
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('does not quote an HTML error page body', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(502, '<html>Bad gateway</html>'));

      const error = await idiraRequest(ctx, get({ method: 'POST' })).catch((e) => e);
      expect(error.message).toBe(
        'Privilege Cloud error 502 on POST /PasswordVault/API/Accounts/12_3 (HTTP 502: Request failed with status code 502). Privilege Cloud may have applied the change: check the current state before you run the action again.'
      );
      expect(error.message).not.toContain('<html>');
    });
  });

  describe('parseRetryAfter', () => {
    it.each([
      ['3', 3000],
      [5, 5000],
      ['', undefined],
      ['soon', undefined],
      [undefined, undefined],
    ])('parseRetryAfter(%p) -> %p', (value, expected) => {
      expect(parseRetryAfter(value)).toBe(expected);
    });

    it('parses an HTTP date', () => {
      const inTenSeconds = new Date(Date.now() + 10_000).toUTCString();
      expect(parseRetryAfter(inTenSeconds)).toBeGreaterThan(8_000);
    });
  });

  describe('nextOffsetFrom', () => {
    it.each([
      ['api/accounts?offset=50&limit=50', 0, 50, 50],
      ['/PasswordVault/API/Safes/S1/Members?limit=25&offset=75', 50, 25, 75],
      ['api/accounts?limit=50', 100, 50, 150],
      ['api/accounts?offset=abc', 0, 10, 10],
      ['', 0, 50, undefined],
      [undefined, 0, 50, undefined],
      ['api/accounts?limit=50', 0, 0, undefined],
    ])('nextLink %p at offset %p with %p items -> %p', (link, offset, length, expected) => {
      expect(nextOffsetFrom(link, offset, length)).toBe(expected);
    });

    it('never moves backwards, so a stale nextLink cannot loop', () => {
      expect(nextOffsetFrom('api/accounts?offset=0', 50, 50)).toBe(100);
    });
  });

  describe('pathSegment', () => {
    const resolvedPath = (segment: string) =>
      new URL(`${API_URL}/PasswordVault/API/Safes/S1/Members/${segment}`).pathname;

    it.each([
      ['an empty value', ''],
      ['a dot segment', '.'],
      ['a double dot segment', '..'],
      ['an encoded dot', '%2e'],
      ['an encoded double dot', '%2e%2e'],
      ['a mixed double dot', '.%2E'],
      ['an encoded slash', 'a%2Fb'],
      ['an encoded backslash', 'a%5cb'],
      ['a slash', 'a/b'],
      ['a trailing slash', 'jsmith/'],
      ['a backslash', 'a\\b'],
    ])('refuses %s (%p)', (_name, value) => {
      expect(() => pathSegment(value)).toThrow(IdiraApiError);
      expect(() => pathSegment(value)).toThrow('cannot be used as a name or ID in a request URL');
    });

    it.each([
      ['a query mark', 'a?b', 'a%3Fb'],
      ['a fragment mark', 'team #1', 'team%20%231'],
      ['three dots', '...', '...'],
      ['dots inside a name', 'a..b', 'a..b'],
      ['an e-mail style name', 'jsmith@corp.example.com', 'jsmith%40corp.example.com'],
      ['non-ASCII', 'jürgen', 'j%C3%BCrgen'],
    ])('encodes %s so it stays in its path segment', (_name, value, encoded) => {
      expect(pathSegment(value)).toBe(encoded);
      expect(resolvedPath(pathSegment(value))).toBe(
        `/PasswordVault/API/Safes/S1/Members/${encoded}`
      );
    });

    it('keeps a very long value in one segment', () => {
      const long = 'x'.repeat(10_000);
      expect(resolvedPath(pathSegment(long))).toBe(`/PasswordVault/API/Safes/S1/Members/${long}`);
    });

    it('shows why the check is needed: the URL parser resolves an unchecked ".."', () => {
      expect(resolvedPath(encodeURIComponent('..'))).toBe('/PasswordVault/API/Safes/S1/');
    });

    it('cuts a long refused value in the error message', () => {
      const error = (() => {
        try {
          pathSegment(`${'a'.repeat(300)}/`);
        } catch (e) {
          return e as Error;
        }
      })();
      expect(error?.message).toContain(`"${'a'.repeat(100)}"`);
      expect(error?.message).not.toContain('a'.repeat(101));
    });
  });

  describe('idiraPage', () => {
    it('returns the page with the vendor count and a parsed nextOffset, never the vendor nextLink, and requests only the API URL', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({
        status: 200,
        data: {
          value: [{ id: '12_3' }, { id: '12_4' }],
          count: 7,
          // A host in nextLink is ignored: only its offset is read, nothing is requested from it.
          nextLink: 'https://evil.example/api/accounts?offset=2&limit=2',
        },
      });

      const page = await idiraPage(ctx, { ...get({ path: '/Accounts' }), offset: 0 });
      expect(page).toEqual({
        value: [{ id: '12_3' }, { id: '12_4' }],
        count: 7,
        nextOffset: 2,
      });
      // The vendor URL is not handed to the caller: nextOffset carries the same information.
      expect(page).not.toHaveProperty('nextLink');
      expect(request).toHaveBeenCalledTimes(1);
      expect(request.mock.calls[0][0].url).toBe(`${API_URL}/PasswordVault/API/Accounts`);
    });

    it('omits nextOffset on the last page', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { value: [{ id: '1_1' }], count: 1 } });

      await expect(idiraPage(ctx, { ...get({ path: '/Accounts' }), offset: 0 })).resolves.toEqual({
        value: [{ id: '1_1' }],
        count: 1,
      });
    });

    it('fails on a body without a value array instead of returning an empty page', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: '' });

      await expect(idiraPage(ctx, { ...get({ path: '/Accounts' }), offset: 0 })).rejects.toThrow(
        'answered GET /PasswordVault/API/Accounts with HTTP 200 and an empty body instead of the value list'
      );
    });
  });

  describe('buildAccountsFilter', () => {
    it('joins the conditions with AND', () => {
      expect(
        buildAccountsFilter({
          safeName: 'SOC Servers',
          platformId: 'WinServerLocal',
          filter: ' modificationTime gte 1700000000 ',
        })
      ).toBe(
        'safeName eq SOC Servers AND platformId eq WinServerLocal AND modificationTime gte 1700000000'
      );
    });

    it('returns undefined without conditions', () => {
      expect(buildAccountsFilter({ filter: '  ' })).toBeUndefined();
    });
  });
});
