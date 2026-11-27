/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AxiosError } from 'axios';
import type { AxiosInstance } from 'axios';
import { loggerMock } from '@kbn/logging-mocks';
import type { ActionContext } from '../../connector_spec';
import type { FalconBody } from './client';
import {
  falconRequest,
  fqlQuote,
  getBaseUrl,
  isAllowedFalconUrl,
  lookupResult,
  nextAfter,
  nextOffset,
  offsetPage,
  retryDelayMs,
  serializeParams,
  timing,
  chunkIdsByUrlBytes,
} from './client';

const SECRETS = {
  authType: 'oauth_client_credentials',
  tokenUrl: 'https://api.crowdstrike.com/oauth2/token',
  clientId: 'client-id',
  clientSecret: 'canary-secret-value',
};

type Reply = { status?: number; data?: unknown; headers?: Record<string, unknown> } | Error;

const makeCtx = (
  replies: Reply[],
  { config = { region: 'us-1' }, secrets = SECRETS }: { config?: object; secrets?: object } = {}
) => {
  const request = jest.fn();
  for (const reply of replies) {
    if (reply instanceof Error) {
      request.mockRejectedValueOnce(reply);
    } else {
      request.mockResolvedValueOnce({ status: 200, headers: {}, data: {}, ...reply });
    }
  }
  const ctx = {
    client: { request } as unknown as AxiosInstance,
    config,
    secrets,
    log: loggerMock.create(),
    getClient: jest.fn(),
  } as unknown as ActionContext;
  return { ctx, request };
};

const falconError = (code: number, message: string) => ({
  meta: {},
  resources: [],
  errors: [{ code, message }],
});

const get = (overrides: Partial<Parameters<typeof falconRequest>[1]> = {}) => ({
  method: 'GET' as const,
  path: '/devices/queries/devices/v1',
  retryServerErrors: true,
  scope: 'the Hosts: Read scope',
  ...overrides,
});

describe('CrowdStrike Falcon client', () => {
  let sleep: jest.SpyInstance;

  beforeEach(() => {
    sleep = jest.spyOn(timing, 'sleep').mockResolvedValue(undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  describe('getBaseUrl', () => {
    it.each([
      ['us-1', 'https://api.crowdstrike.com'],
      ['us-2', 'https://api.us-2.crowdstrike.com'],
      ['us-3', 'https://api.us-3.crowdstrike.com'],
      ['eu-1', 'https://api.eu-1.crowdstrike.com'],
      ['us-gov-1', 'https://api.laggar.gcw.crowdstrike.com'],
      ['us-gov-2', 'https://api.us-gov-2.crowdstrike.mil'],
    ])('maps cloud %s to %s', (region, origin) => {
      const { ctx } = makeCtx([], { config: { region }, secrets: {} });
      expect(getBaseUrl(ctx)).toBe(origin);
    });

    it('defaults to us-1 and uses the API URL origin for a custom cloud', () => {
      expect(getBaseUrl(makeCtx([], { config: {}, secrets: {} }).ctx)).toBe(
        'https://api.crowdstrike.com'
      );
      const { ctx } = makeCtx([], {
        config: { region: 'custom', apiUrl: 'https://falcon.example.com/' },
        secrets: { tokenUrl: 'https://falcon.example.com/oauth2/token' },
      });
      expect(getBaseUrl(ctx)).toBe('https://falcon.example.com');
    });

    it('requires an API URL for a custom cloud', () => {
      const { ctx } = makeCtx([], { config: { region: 'custom' } });
      expect(() => getBaseUrl(ctx)).toThrow('no API URL is configured');
    });

    it('refuses a token URL on another host than the selected cloud, without sending anything', async () => {
      const { ctx, request } = makeCtx([], {
        config: { region: 'eu-1' },
        secrets: { ...SECRETS, tokenUrl: 'https://api.crowdstrike.com/oauth2/token' },
      });
      await expect(falconRequest(ctx, get())).rejects.toThrow(
        'Set the token URL to https://api.eu-1.crowdstrike.com/oauth2/token'
      );
      expect(request).not.toHaveBeenCalled();
    });
  });

  describe('isAllowedFalconUrl', () => {
    const token = /^\/oauth2\/token$/;
    it.each([
      ['https://api.crowdstrike.com/oauth2/token', true],
      ['https://api.eu-1.crowdstrike.com/oauth2/token', true],
      ['http://localhost:18080/oauth2/token', true],
      ['http://127.0.0.1:18080/oauth2/token', true],
      ['http://api.crowdstrike.com/oauth2/token', false],
      ['https://user:pass@api.crowdstrike.com/oauth2/token', false],
      ['https://api.crowdstrike.com/oauth2/token?x=1', false],
      ['https://api.crowdstrike.com/oauth2/token#frag', false],
      ['https://api.crowdstrike.com/other', false],
      ['https://api.crowdstrike.com/oauth2/token/extra', false],
      ['not a url', false],
    ])('token URL %s -> %s', (value, expected) => {
      expect(isAllowedFalconUrl(value, token)).toBe(expected);
    });

    it('accepts plain HTTP on a loopback host only outside a production build', () => {
      const previous = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        expect(isAllowedFalconUrl('http://localhost:18080/oauth2/token', token)).toBe(false);
        expect(isAllowedFalconUrl('http://127.0.0.1:18080', /^\/?$/)).toBe(false);
        expect(isAllowedFalconUrl('https://api.crowdstrike.com/oauth2/token', token)).toBe(true);
      } finally {
        process.env.NODE_ENV = previous;
      }
    });

    it.each([
      ['https://falcon.example.com', true],
      ['https://falcon.example.com/', true],
      ['https://falcon.example.com/api', false],
      ['ftp://falcon.example.com', false],
    ])('API URL %s -> %s', (value, expected) => {
      expect(isAllowedFalconUrl(value, /^\/?$/)).toBe(expected);
    });
  });

  it('serializes arrays as repeated parameters and drops unset values', () => {
    expect(serializeParams({ ids: ['a', 'b'], limit: 5, sort: undefined, x: null })).toBe(
      'ids=a&ids=b&limit=5'
    );
    expect(serializeParams({ filter: "hostname:'a b'+platform_name:'Linux'" })).toBe(
      'filter=hostname%3A%27a+b%27%2Bplatform_name%3A%27Linux%27'
    );
  });

  it('quotes FQL values and escapes quotes and backslashes', () => {
    expect(fqlQuote('web-01')).toBe("'web-01'");
    expect(fqlQuote("it's")).toBe("'it\\'s'");
    expect(fqlQuote('C:\\x')).toBe("'C:\\\\x'");
    expect(fqlQuote("a'+status:'closed")).toBe("'a\\'+status:\\'closed'");
  });

  describe('retryDelayMs', () => {
    it('[C-http-policy] waits until X-RateLimit-RetryAfter (epoch seconds), capped at 30 s', () => {
      jest.spyOn(timing, 'now').mockReturnValue(1_700_000_000_000);
      const delay = retryDelayMs({ 'x-ratelimit-retryafter': '1700000005' }, 1);
      expect(delay).toBeGreaterThanOrEqual(5000);
      expect(delay).toBeLessThan(5250);
      expect(retryDelayMs({ 'X-RateLimit-RetryAfter': '1700009999' }, 1)).toBe(30_000);
    });

    it('[C-http-policy] falls back to Retry-After, then to 1 s, 2 s, 4 s', () => {
      jest.spyOn(timing, 'now').mockReturnValue(1_800_000_000_000);
      // A reset time in the past is ignored.
      expect(
        retryDelayMs({ 'X-RateLimit-RetryAfter': '1700000060', 'Retry-After': '2' }, 1)
      ).toBeGreaterThanOrEqual(2000);
      expect(retryDelayMs({}, 1)).toBeLessThan(1250);
      expect(retryDelayMs({}, 2)).toBeGreaterThanOrEqual(2000);
      expect(retryDelayMs({}, 3)).toBeGreaterThanOrEqual(4000);
      expect(retryDelayMs({ 'Retry-After': '120' }, 1)).toBe(30_000);
    });
  });

  describe('falconRequest', () => {
    it('sends to the cloud host with a 60 s timeout, no redirects and repeated params', async () => {
      const { ctx, request } = makeCtx([{ data: { resources: ['a'] } }]);
      await falconRequest(ctx, get({ params: { ids: ['a', 'b'] } }));
      const config = request.mock.calls[0][0];
      expect(config).toMatchObject({
        method: 'GET',
        url: 'https://api.crowdstrike.com/devices/queries/devices/v1',
        params: { ids: ['a', 'b'] },
        timeout: 60_000,
        maxRedirects: 0,
      });
      expect(config.paramsSerializer.serialize(config.params)).toBe('ids=a&ids=b');
    });

    it('[C-http-policy] retries 429 up to 3 times, then reports the rate limit', async () => {
      const limited = { status: 429, data: falconError(429, 'API rate limit exceeded') };
      const { ctx, request } = makeCtx([limited, limited, limited, limited]);
      await expect(falconRequest(ctx, get({ retryServerErrors: false }))).rejects.toThrow(
        'Status code: 429. Message: rate limit reached after 3 retries (API rate limit exceeded)'
      );
      expect(request).toHaveBeenCalledTimes(4);
      expect(sleep).toHaveBeenCalledTimes(3);
    });

    it('[C-http-policy] succeeds when a retry after 429 succeeds, even for a state-changing call', async () => {
      const { ctx, request } = makeCtx([
        { status: 429, data: falconError(429, 'limited'), headers: { 'retry-after': '1' } },
        { status: 200, data: { resources: ['ok'] } },
      ]);
      const response = await falconRequest(ctx, get({ method: 'POST', retryServerErrors: false }));
      expect(response.data).toEqual({ resources: ['ok'] });
      expect(request).toHaveBeenCalledTimes(2);
    });

    it('[C-http-policy] retries 5xx only when the call allows it', async () => {
      const failed = { status: 503, data: falconError(503, 'unavailable') };
      const retried = makeCtx([failed, { status: 200, data: {} }]);
      await falconRequest(retried.ctx, get());
      expect(retried.request).toHaveBeenCalledTimes(2);

      const once = makeCtx([failed]);
      await expect(falconRequest(once.ctx, get({ retryServerErrors: false }))).rejects.toThrow(
        'Status code: 503. Message: unavailable'
      );
      expect(once.request).toHaveBeenCalledTimes(1);
    });

    it.each([400, 404, 409])('does not retry %s', async (status) => {
      const { ctx, request } = makeCtx([{ status, data: falconError(status, 'bad input') }]);
      await expect(falconRequest(ctx, get())).rejects.toThrow(
        `Status code: ${status}. Message: bad input`
      );
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('[C-edge-401-on-an-api-call] refreshes the token once on 401 and repeats the call with it', async () => {
      const { ctx, request } = makeCtx([
        { status: 401, data: falconError(401, 'access denied, invalid bearer token') },
        { status: 201, data: { access_token: 'fresh', token_type: 'bearer', expires_in: 1799 } },
        { status: 200, data: { resources: ['a'] } },
      ]);
      await expect(falconRequest(ctx, get())).resolves.toMatchObject({ status: 200 });
      const tokenCall = request.mock.calls[1][0];
      expect(tokenCall).toMatchObject({
        method: 'POST',
        url: SECRETS.tokenUrl,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: undefined },
        maxRedirects: 0,
      });
      expect(new URLSearchParams(tokenCall.data).get('client_id')).toBe('client-id');
      expect(new URLSearchParams(tokenCall.data).get('grant_type')).toBe('client_credentials');
      expect(request.mock.calls[2][0].headers.Authorization).toBe('Bearer fresh');
    });

    it('[C-edge-401-on-an-api-call] reuses the refreshed token for later calls of the same action', async () => {
      const { ctx, request } = makeCtx([
        { status: 401, data: falconError(401, 'access denied, invalid bearer token') },
        { status: 201, data: { access_token: 'fresh' } },
        { status: 200, data: { resources: ['a'] } },
        { status: 200, data: { resources: ['b'] } },
      ]);
      await falconRequest(ctx, get());
      await expect(falconRequest(ctx, get())).resolves.toMatchObject({ status: 200 });
      expect(request).toHaveBeenCalledTimes(4);
      expect(request.mock.calls[3][0].headers.Authorization).toBe('Bearer fresh');
      const other = makeCtx([{ status: 200, data: { resources: [] } }]);
      await falconRequest(other.ctx, get());
      expect(other.request.mock.calls[0][0].headers.Authorization).toBeUndefined();
    });

    it('[C-edge-401-on-an-api-call] fails with an auth error on a second 401, without a third try', async () => {
      const denied = { status: 401, data: falconError(401, 'access denied') };
      const { ctx, request } = makeCtx([
        denied,
        { status: 201, data: { access_token: 'fresh' } },
        denied,
      ]);
      await expect(falconRequest(ctx, get())).rejects.toThrow(
        'Status code: 401. Message: authentication failed; check the client ID and secret and that the Falcon cloud matches the tenant'
      );
      expect(request).toHaveBeenCalledTimes(3);
    });

    it('[C-edge-failed-token-fetch] fails with an auth error when the token refresh is refused', async () => {
      const { ctx, request } = makeCtx([
        { status: 401, data: falconError(401, 'access denied') },
        { status: 403, data: falconError(403, 'invalid client') },
      ]);
      await expect(falconRequest(ctx, get())).rejects.toThrow('Status code: 401.');
      expect(request).toHaveBeenCalledTimes(2);
    });

    it('names the scope the action needs on 403', async () => {
      const { ctx } = makeCtx([
        { status: 403, data: falconError(403, 'access denied, authorization failed') },
      ]);
      await expect(falconRequest(ctx, get())).rejects.toThrow(
        'Status code: 403. Message: access denied, authorization failed; the API client needs the Hosts: Read scope for this action'
      );
    });

    it('reports an unexpected body as an unknown API error', async () => {
      const { ctx } = makeCtx([{ status: 500, data: '<html>oops</html>' }]);
      await expect(falconRequest(ctx, get({ retryServerErrors: false }))).rejects.toThrow(
        'Status code: 500. Message: Unknown API error'
      );
    });

    it('returns a 404 to the caller when allowed', async () => {
      const { ctx } = makeCtx([{ status: 404, data: falconError(404, 'not found') }]);
      await expect(falconRequest(ctx, get({ allowNotFound: true }))).resolves.toMatchObject({
        status: 404,
      });
    });

    it('[C-edge-network-failure] names the host and the cause of a network failure, without credentials', async () => {
      const error = new AxiosError('getaddrinfo ENOTFOUND api.crowdstrike.com', 'ENOTFOUND');
      const { ctx } = makeCtx([error]);
      const failure = await falconRequest(ctx, get()).catch((e: Error) => e);
      expect((failure as Error).message).toBe(
        'Could not reach api.crowdstrike.com: ENOTFOUND (getaddrinfo ENOTFOUND api.crowdstrike.com)'
      );
      expect((failure as Error).message).not.toContain(SECRETS.clientSecret);

      const timeout = makeCtx([new AxiosError('timeout of 60000ms exceeded', 'ECONNABORTED')]);
      await expect(falconRequest(timeout.ctx, get())).rejects.toThrow(
        'Could not reach api.crowdstrike.com: timeout'
      );
    });

    it("reports a response over Kibana's size limit as that, not as a connection failure", async () => {
      const error = new AxiosError('maxContentLength size of 1048576 exceeded', 'ERR_BAD_RESPONSE');
      const { ctx } = makeCtx([error]);
      const failure = (await falconRequest(ctx, get()).catch((e: Error) => e)) as Error;
      expect(failure.message).toBe(
        'The response from api.crowdstrike.com is larger than Kibana allows (xpack.actions.maxResponseContentLength, 1mb by default). Request fewer items with a lower limit or fewer ids, or raise that setting.'
      );
      expect(failure.message).not.toContain('Could not reach');
    });

    it('[C-http-policy] treats a redirect as an error instead of following it', async () => {
      const { ctx } = makeCtx([{ status: 302, headers: { location: 'https://evil.example' } }]);
      await expect(falconRequest(ctx, get())).rejects.toThrow('Status code: 302.');
    });
  });

  describe('paging', () => {
    const body = (total?: number, after?: string) => ({
      meta: { pagination: { total, after } },
    });

    it('computes next_offset from the total, and null on the last page', () => {
      expect(nextOffset(body(250), 0, 100, 100)).toBe(100);
      expect(nextOffset(body(250), 200, 100, 50)).toBeNull();
      expect(nextOffset(body(250), 0, 100, 0)).toBeNull();
      expect(nextOffset(body(undefined), 0, 100, 100)).toBe(100);
      expect(nextOffset(body(undefined), 0, 100, 40)).toBeNull();
      expect(nextOffset(body(50_000), 9_900, 100, 100, 10_000)).toBeNull();
    });

    it('treats a null or non-numeric total as missing, not as 0', () => {
      const withTotal = (total: unknown) => ({ meta: { pagination: { total } } } as FalconBody);
      expect(nextOffset(withTotal(null), 0, 100, 100)).toBe(100);
      expect(nextOffset(withTotal(null), 0, 100, 40)).toBeNull();
      expect(nextOffset(withTotal(''), 200, 100, 100)).toBe(300);
      expect(nextOffset(withTotal(false), 0, 100, 100)).toBe(100);
    });

    it('returns the cursor only when one is given and the page is not empty', () => {
      expect(nextAfter(body(10, 'abc'), 5)).toBe('abc');
      expect(nextAfter(body(10, ''), 5)).toBeNull();
      expect(nextAfter(body(10, 'abc'), 0)).toBeNull();
    });

    it('turns a 404 on a search into an empty page', async () => {
      const { ctx } = makeCtx([{ status: 404, data: falconError(404, 'no match') }]);
      await expect(
        offsetPage(ctx, { path: '/x', params: { offset: 0 }, scope: 's' })
      ).resolves.toMatchObject({ resources: [], next_offset: null });
    });

    it('[C-edge-partial-batch-failure] raises a 404 lookup with no resources and returns a partial one', () => {
      expect(() =>
        lookupResult({ status: 404, data: falconError(404, 'ids not found'), headers: {} })
      ).toThrow('Status code: 404. Message: ids not found');
      expect(
        lookupResult({
          status: 404,
          data: { resources: [{ id: 'a' }], errors: [{ code: 404, message: 'b not found' }] },
          headers: {},
        })
      ).toMatchObject({ resources: [{ id: 'a' }], errors: [{ message: 'b not found' }] });
    });
  });
  describe('URL byte budget', () => {
    it('refuses a request whose URL would pass 8000 bytes, before sending it', async () => {
      const { ctx, request } = makeCtx([]);
      const ids = Array.from({ length: 120 }, (_, i) => i.toString(16).padStart(64, 'a'));
      await expect(
        falconRequest(ctx, {
          method: 'DELETE',
          path: '/iocs/entities/indicators/v1',
          params: { ids },
          retryServerErrors: true,
          scope: 'IOC Management: Write',
        })
      ).rejects.toThrow(/over the 8000-byte limit/);
      expect(request).not.toHaveBeenCalled();
    });

    it('counts multi-byte characters in bytes, not characters', async () => {
      const { ctx, request } = makeCtx([]);
      await expect(
        falconRequest(ctx, {
          method: 'GET',
          path: '/x',
          params: { comment: '\u00e9'.repeat(1400) },
          retryServerErrors: true,
          scope: 's',
        })
      ).rejects.toThrow(/over the 8000-byte limit/);
      expect(request).not.toHaveBeenCalled();
    });

    it('splits detail ids into chunks that each stay under the budget', () => {
      const ids = Array.from({ length: 150 }, (_, i) => `${i}`.padStart(100, 'f'));
      const chunks = chunkIdsByUrlBytes(ids);
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks.flat()).toEqual(ids);
      for (const chunk of chunks) {
        expect(serializeParams({ ids: chunk }).length).toBeLessThanOrEqual(7500);
      }
      expect(chunkIdsByUrlBytes(['a', 'b'])).toEqual([['a', 'b']]);
    });
  });
});
