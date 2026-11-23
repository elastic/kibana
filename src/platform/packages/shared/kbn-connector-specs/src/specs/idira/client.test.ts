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
  MAX_ATTEMPTS,
  MIN_ATTEMPT_MS,
  REQUEST_BUDGET_MS,
  REQUEST_TIMEOUT_MS,
  buildAccountsFilter,
  getApiUrl,
  idiraPage,
  idiraRequest,
  isSecureApiUrl,
  nextOffsetFrom,
  parseRetryAfter,
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
  let sleep: jest.SpyInstance;
  let random: jest.SpyInstance;

  beforeEach(() => {
    sleep = jest.spyOn(retryTiming, 'sleep').mockResolvedValue(undefined);
    random = jest.spyOn(retryTiming, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

    it('retries a 429 with back-off and returns the later answer', async () => {
      const { ctx, request } = createContext();
      request
        .mockRejectedValueOnce(httpError(429))
        .mockRejectedValueOnce(httpError(429))
        .mockResolvedValue({ status: 200, data: { ok: 1 } });

      await expect(idiraRequest(ctx, get())).resolves.toEqual({ status: 200, data: { ok: 1 } });
      expect(request).toHaveBeenCalledTimes(3);
      // Full jitter with random() = 0.5: half of 1 s, then half of 2 s.
      expect(sleep.mock.calls).toEqual([[500], [1000]]);
    });

    it('retries a 429 on a POST too: the vendor rejects it without processing it', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValueOnce(httpError(429)).mockResolvedValue({ status: 200, data: '' });

      await idiraRequest(ctx, get({ method: 'POST', path: '/Accounts/12_3/Change' }));
      expect(request).toHaveBeenCalledTimes(2);
    });

    it('honours Retry-After, capped at 60 s', async () => {
      const { ctx, request } = createContext();
      request
        .mockRejectedValueOnce(httpError(429, {}, { 'retry-after': '7' }))
        .mockRejectedValueOnce(httpError(429, {}, { 'retry-after': '600' }))
        .mockResolvedValue({ status: 200, data: {} });

      await idiraRequest(ctx, get());
      expect(sleep.mock.calls).toEqual([[7000], [60000]]);
    });

    it('fails with a rate-limit error after 3 retries', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(
        httpError(429, { ErrorCode: 'TOO_MANY_REQUESTS', ErrorMessage: 'Too many requests' })
      );

      await expect(idiraRequest(ctx, get())).rejects.toThrow(
        'Rate limited by Privilege Cloud on GET /PasswordVault/API/Accounts/12_3; retried 3 times'
      );
      expect(request).toHaveBeenCalledTimes(MAX_ATTEMPTS);
    });

    describe('time budget', () => {
      /** Kibana's HTTP server drops a request idle for 120 s (server.socketTimeout default). */
      const KIBANA_EXECUTE_LIMIT_MS = 120_000;
      let clock: number;

      beforeEach(() => {
        clock = 0;
        jest.spyOn(retryTiming, 'now').mockImplementation(() => clock);
        sleep.mockImplementation(async (ms: number) => {
          clock += ms;
        });
      });

      it('stays under the execute limit in the worst case: slow 429s with the longest Retry-After', async () => {
        const { ctx, request } = createContext();
        // Every attempt uses its whole timeout, then answers 429 with a 60 s Retry-After.
        request.mockImplementation(async ({ timeout }: { timeout: number }) => {
          clock += timeout;
          throw httpError(429, { ErrorMessage: 'Too many requests' }, { 'retry-after': '600' });
        });

        await expect(idiraRequest(ctx, get())).rejects.toThrow(
          'Rate limited by Privilege Cloud on GET /PasswordVault/API/Accounts/12_3; retried 1 time'
        );
        expect(clock).toBeLessThanOrEqual(REQUEST_BUDGET_MS);
        expect(REQUEST_BUDGET_MS).toBeLessThan(KIBANA_EXECUTE_LIMIT_MS);
        for (const [config] of request.mock.calls) {
          expect(config.timeout).toBeGreaterThanOrEqual(MIN_ATTEMPT_MS);
          expect(config.timeout).toBeLessThanOrEqual(REQUEST_TIMEOUT_MS);
        }
      });

      it('skips a retry whose Retry-After would overrun the budget and says why', async () => {
        const { ctx, request } = createContext();
        request
          .mockRejectedValueOnce(httpError(429, {}, { 'retry-after': '60' }))
          .mockImplementationOnce(async () => {
            clock += 30_000;
            throw httpError(
              429,
              { ErrorCode: 'TOO_MANY_REQUESTS', ErrorMessage: 'Too many requests' },
              { 'retry-after': '60' }
            );
          })
          .mockResolvedValue({ status: 200, data: {} });

        await expect(idiraRequest(ctx, get())).rejects.toThrow(
          "retried 1 time (HTTP 429 TOO_MANY_REQUESTS: Too many requests). Wait and try again. No further retry was made: waiting 60 s before it would pass the connector's 100 s time limit for one call."
        );
        expect(request).toHaveBeenCalledTimes(2);
        expect(sleep.mock.calls).toEqual([[60000]]);
      });

      it('gives each retry only the remaining budget as its timeout', async () => {
        const { ctx, request } = createContext();
        request
          .mockRejectedValueOnce(httpError(503, {}, { 'retry-after': '60' }))
          .mockImplementationOnce(async () => {
            clock += 10_000;
            throw httpError(503, {}, { 'retry-after': '20' });
          })
          .mockResolvedValue({ status: 200, data: { ok: 1 } });

        await expect(idiraRequest(ctx, get())).resolves.toEqual({ status: 200, data: { ok: 1 } });
        expect(request.mock.calls.map(([config]) => config.timeout)).toEqual([
          REQUEST_TIMEOUT_MS,
          REQUEST_TIMEOUT_MS,
          REQUEST_BUDGET_MS - 60_000 - 10_000 - 20_000,
        ]);
      });

      it('reports a request cut by the budget as a timeout of the whole call', async () => {
        const { ctx, request } = createContext();
        request
          .mockRejectedValueOnce(httpError(429, {}, { 'retry-after': '60' }))
          .mockImplementationOnce(async () => {
            clock += 15_000;
            throw httpError(429, {}, { 'retry-after': '10' });
          })
          .mockImplementationOnce(async ({ timeout }: { timeout: number }) => {
            clock += timeout;
            throw Object.assign(new Error(`timeout of ${timeout}ms exceeded`), {
              isAxiosError: true,
              code: 'ECONNABORTED',
            });
          });

        await expect(idiraRequest(ctx, get())).rejects.toThrow(
          "failed: timeout of 15000ms exceeded. The request was stopped at the connector's 100 s time limit for one call. Try again later."
        );
        expect(clock).toBe(REQUEST_BUDGET_MS);
      });

      it('never starts a request when an overrunning wait left no budget', async () => {
        const { ctx, request } = createContext();
        sleep.mockImplementation(async (ms: number) => {
          clock += ms + REQUEST_BUDGET_MS; // a timer that fires far too late
        });
        request.mockRejectedValue(httpError(429));

        await expect(idiraRequest(ctx, get())).rejects.toThrow(
          "No further retry was made: the connector's 100 s time limit for one call was spent."
        );
        expect(request).toHaveBeenCalledTimes(1);
      });
    });

    it.each([502, 503, 504])('retries a %s on a GET', async (status) => {
      const { ctx, request } = createContext();
      request.mockRejectedValueOnce(httpError(status)).mockResolvedValue({ status: 200, data: {} });

      await idiraRequest(ctx, get());
      expect(request).toHaveBeenCalledTimes(2);
    });

    it.each(['POST', 'PATCH', 'DELETE'] as const)(
      'never retries a 503 on a %s, which may already have been processed',
      async (method) => {
        const { ctx, request } = createContext();
        request.mockRejectedValue(httpError(503, { ErrorMessage: 'Service unavailable' }));

        await expect(idiraRequest(ctx, get({ method }))).rejects.toThrow(
          'Privilege Cloud error 503'
        );
        expect(request).toHaveBeenCalledTimes(1);
      }
    );

    it('never retries a network error on a write', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(new Error('socket hang up'));

      await expect(
        idiraRequest(ctx, get({ method: 'POST', path: '/Accounts/12_3/Change' }))
      ).rejects.toThrow(
        'Privilege Cloud request POST /PasswordVault/API/Accounts/12_3/Change failed: socket hang up'
      );
      expect(request).toHaveBeenCalledTimes(1);
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
    ])('maps a %s at once, without retrying', async (status, message) => {
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
      expect(sleep).not.toHaveBeenCalled();
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
        'Privilege Cloud error 502 on POST /PasswordVault/API/Accounts/12_3 (HTTP 502: Request failed with status code 502).'
      );
    });
  });

  describe('retry helpers', () => {
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

    it('caps the jittered back-off at 30 s', () => {
      random.mockReturnValue(0.999999);
      expect(retryDelay(undefined, 1)).toBe(999);
      expect(retryDelay(undefined, 3)).toBe(3999);
      expect(retryDelay(undefined, 10)).toBe(29999);
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

  describe('idiraPage', () => {
    it('returns the page with the vendor count and a parsed nextOffset, and requests only the API URL', async () => {
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
        nextLink: 'https://evil.example/api/accounts?offset=2&limit=2',
        nextOffset: 2,
      });
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

    it('returns an empty page when the body has no value array', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: '' });

      await expect(idiraPage(ctx, { ...get({ path: '/Accounts' }), offset: 0 })).resolves.toEqual({
        value: [],
      });
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
