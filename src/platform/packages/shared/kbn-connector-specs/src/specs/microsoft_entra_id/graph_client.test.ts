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
  buildGraphUrl,
  callGraph,
  checkNextLink,
  createDeadline,
  getGraphOrigin,
  graphRequest,
  isAllowedGraphBaseUrl,
  retryDelayMs,
  retryTiming,
  toGraphError,
  userSegment,
} from './graph_client';

const graphError = (status: number, code = 'Code', message = 'Graph says no', headers = {}) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data: { error: { code, message } }, headers },
  });

const makeContext = (config: Record<string, unknown> = {}) => {
  const request = jest.fn();
  const ctx = {
    client: { request },
    config,
    secrets: { authType: 'oauth_client_credentials' },
    log: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() },
  } as unknown as ActionContext;
  return { ctx, request };
};

describe('graph_client', () => {
  let sleep: jest.SpyInstance;
  beforeEach(() => {
    sleep = jest.spyOn(retryTiming, 'sleep').mockResolvedValue(undefined);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('isAllowedGraphBaseUrl', () => {
    it.each([
      ['https://graph.microsoft.com', true],
      ['https://graph.microsoft.us/', true],
      ['https://dod-graph.microsoft.us', true],
      ['https://microsoftgraph.chinacloudapi.cn', true],
      ['http://localhost:18080', true],
      ['http://127.0.0.1:18080', true],
      ['http://[::1]:8080', true],
      ['http://graph.microsoft.com', false],
      ['http://10.0.0.5', false],
      ['https://graph.microsoft.com/v1.0', false],
      ['https://user:pass@graph.microsoft.com', false],
      ['https://graph.microsoft.com?x=1', false],
      ['ftp://graph.microsoft.com', false],
      ['not a url', false],
    ])('%s -> %s', (url, expected) => {
      expect(isAllowedGraphBaseUrl(url)).toBe(expected);
    });

    it('getGraphOrigin defaults to the global host and refuses a plain http host', () => {
      expect(getGraphOrigin(makeContext().ctx)).toBe('https://graph.microsoft.com');
      expect(getGraphOrigin(makeContext({ graphBaseUrl: 'https://graph.microsoft.us/' }).ctx)).toBe(
        'https://graph.microsoft.us'
      );
      expect(() =>
        getGraphOrigin(makeContext({ graphBaseUrl: 'http://evil.example' }).ctx)
      ).toThrow(/must be an https URL/);
    });
  });

  describe('URLs', () => {
    it('encodes user ids and uses the key form for a userPrincipalName starting with $', () => {
      expect(userSegment('a b/c@contoso.com')).toBe('users/a%20b%2Fc%40contoso.com');
      expect(userSegment("$adm'in@contoso.com")).toBe("users('%24adm''in%40contoso.com')");
    });

    it('builds the URL with literal $ keys, percent-encoded values and no undefined entries', () => {
      const { ctx } = makeContext();
      expect(
        buildGraphUrl(ctx, '/users', {
          $filter: "mail eq 'a+b@contoso.com'",
          $top: 5,
          $count: undefined,
        })
      ).toBe(
        "https://graph.microsoft.com/v1.0/users?$filter=mail%20eq%20'a%2Bb%40contoso.com'&$top=5"
      );
      expect(buildGraphUrl(ctx, '/me', {}, 'beta')).toBe('https://graph.microsoft.com/beta/me');
    });
  });

  describe('toGraphError', () => {
    it('gives 401 and 403 different explanations and keeps Graph code and message', () => {
      const unauthorized = toGraphError(graphError(401, 'InvalidAuthenticationToken'), 'getUser');
      const forbidden = toGraphError(graphError(403, 'Authorization_RequestDenied'), 'getUser');
      expect(unauthorized.message).toBe(
        'getUser failed: authentication failed (InvalidAuthenticationToken): Graph says no. Check the client ID, the client secret or certificate, and the tenant ID in the token URL'
      );
      expect(forbidden.message).toContain('access denied (Authorization_RequestDenied)');
      expect(forbidden.message).toContain('Microsoft Entra ID P2');
      expect(forbidden.message).not.toContain('client secret');
    });

    it.each([
      [400, 'Microsoft Graph rejected the request (Code): Graph says no'],
      [404, 'not found (Code): Graph says no'],
      [409, 'conflict (Code): Graph says no'],
      [429, 'rate limit reached'],
      [503, 'temporarily unavailable (HTTP 503)'],
      [500, 'HTTP 500 (Code): Graph says no'],
    ])('maps %s', (status, text) => {
      expect(toGraphError(graphError(status), 'x').message).toContain(text);
    });

    it('reads the text and code of a directory error sent as a JSON string in error.message', () => {
      const directoryError = JSON.stringify({
        'odata.error': {
          code: 'directory_error',
          message: { lang: 'en', value: "A key with identifier 'k1' was not found for user 'u1'" },
          values: [{ item: 'subCode', value: 'error_key_not_found' }],
        },
      });
      expect(
        toGraphError(graphError(404, 'Request_ResourceNotFound', directoryError), 'x').message
      ).toBe(
        "x failed: not found (Request_ResourceNotFound): A key with identifier 'k1' was not found for user 'u1'"
      );
      const withoutOuterCode = Object.assign(new Error('status 404'), {
        response: { status: 404, data: { error: { message: directoryError } }, headers: {} },
      });
      expect(toGraphError(withoutOuterCode, 'x').message).toBe(
        "x failed: not found (directory_error): A key with identifier 'k1' was not found for user 'u1'"
      );
    });

    it.each([
      ['{not json', '{not json'],
      ['{"other":{"message":"m"}}', '{"other":{"message":"m"}}'],
      [
        '{"odata.error":{"code":"c","message":{"lang":"en"}}}',
        '{"odata.error":{"code":"c","message":{"lang":"en"}}}',
      ],
    ])(
      'keeps an error message that is not a readable directory error as sent: %s',
      (raw, shown) => {
        expect(toGraphError(graphError(400, 'Code', raw), 'x').message).toBe(
          `x failed: Microsoft Graph rejected the request (Code): ${shown}`
        );
      }
    );

    it('reports a transport failure with its own message', () => {
      expect(toGraphError(new Error('socket hang up'), 'x').message).toBe(
        'x failed: socket hang up'
      );
    });
  });

  describe('graphRequest', () => {
    it('sends a 30 s timeout and returns the response', async () => {
      const { ctx, request } = makeContext();
      request.mockResolvedValue({ status: 200, data: { ok: 1 } });
      const response = await graphRequest(ctx, { method: 'GET', url: 'u' }, { idempotent: true });
      expect(response.data).toEqual({ ok: 1 });
      expect(request).toHaveBeenCalledWith({ method: 'GET', url: 'u', timeout: 30_000 });
    });

    it('retries 429 honouring Retry-After, for a non-idempotent call too', async () => {
      const { ctx, request } = makeContext();
      request
        .mockRejectedValueOnce(
          graphError(429, 'TooManyRequests', 'slow down', { 'retry-after': '7' })
        )
        .mockResolvedValueOnce({ status: 204 });
      await graphRequest(ctx, { method: 'POST', url: 'u' }, { idempotent: false });
      expect(request).toHaveBeenCalledTimes(2);
      expect(sleep.mock.calls[0][0]).toBeGreaterThanOrEqual(7_000);
      expect(sleep.mock.calls[0][0]).toBeLessThan(7_500);
    });

    it('caps Retry-After at 60 s and falls back to 2 s then 5 s', () => {
      expect(retryDelayMs(graphError(429, 'c', 'm', { 'retry-after': '600' }), 1)).toBeLessThan(
        60_500
      );
      expect(retryDelayMs(graphError(503), 1)).toBeGreaterThanOrEqual(2_000);
      expect(retryDelayMs(graphError(503), 2)).toBeGreaterThanOrEqual(5_000);
      expect(retryDelayMs(graphError(503), 2)).toBeLessThan(5_500);
    });

    it.each(['', '   '])(
      'ignores a blank Retry-After header (%j) and backs off 2 s then 5 s',
      (retryAfter) => {
        const error = graphError(429, 'c', 'm', { 'retry-after': retryAfter });
        expect(retryDelayMs(error, 1)).toBeGreaterThanOrEqual(2_000);
        expect(retryDelayMs(error, 1)).toBeLessThan(2_500);
        expect(retryDelayMs(error, 2)).toBeGreaterThanOrEqual(5_000);
      }
    );

    it('says a 429 may have been retried, not that it was, when Retry-After is beyond the budget', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(
        graphError(429, 'TooManyRequests', 'slow down', { 'retry-after': '50' })
      );
      await expect(
        callGraph(
          ctx,
          'listUsers',
          { method: 'GET', url: 'u' },
          { idempotent: true, deadline: createDeadline(10_000) }
        )
      ).rejects.toThrow(
        'listUsers failed: Microsoft Graph rate limit reached; the request may have been retried, try again later (TooManyRequests): slow down'
      );
      expect(request).toHaveBeenCalledTimes(1);
      expect(sleep).not.toHaveBeenCalled();
    });

    it('stops after 3 attempts and rethrows the last error', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(graphError(503));
      await expect(
        graphRequest(ctx, { method: 'GET', url: 'u' }, { idempotent: true })
      ).rejects.toMatchObject({ response: { status: 503 } });
      expect(request).toHaveBeenCalledTimes(3);
    });

    it('does not retry 503 for a call that is not safe to repeat', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(graphError(503));
      await expect(
        graphRequest(ctx, { method: 'POST', url: 'u' }, { idempotent: false })
      ).rejects.toBeDefined();
      expect(request).toHaveBeenCalledTimes(1);
    });

    it.each([400, 401, 403, 404, 409])('does not retry %s', async (status) => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(graphError(status));
      await expect(
        graphRequest(ctx, { method: 'GET', url: 'u' }, { idempotent: true })
      ).rejects.toBeDefined();
      expect(request).toHaveBeenCalledTimes(1);
      expect(sleep).not.toHaveBeenCalled();
    });

    it('does not wait past the action time budget', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(graphError(429, 'c', 'm', { 'retry-after': '50' }));
      const deadline = createDeadline(10_000);
      await expect(
        graphRequest(ctx, { method: 'GET', url: 'u' }, { idempotent: true, deadline })
      ).rejects.toMatchObject({ response: { status: 429 } });
      expect(request).toHaveBeenCalledTimes(1);
      expect(sleep).not.toHaveBeenCalled();
    });

    it('gives each request only the remaining budget as its timeout', async () => {
      const { ctx, request } = makeContext();
      request.mockResolvedValue({ status: 200 });
      await graphRequest(
        ctx,
        { method: 'GET', url: 'u' },
        { idempotent: true, deadline: createDeadline(4_000) }
      );
      expect(request.mock.calls[0][0].timeout).toBeLessThanOrEqual(4_000);
    });
  });

  describe('checkNextLink', () => {
    const { ctx } = makeContext();
    const users = /^\/v1\.0\/users\/?$/i;

    it('accepts a link on the configured host and collection', () => {
      const link = 'https://graph.microsoft.com/v1.0/users?$skiptoken=abc';
      expect(checkNextLink(ctx, link, users)).toBe(link);
    });

    it('resolves a relative link against the configured host', () => {
      expect(checkNextLink(ctx, '/v1.0/users?$skiptoken=abc', users)).toBe(
        'https://graph.microsoft.com/v1.0/users?$skiptoken=abc'
      );
    });

    it.each([
      'https://evil.example/v1.0/users?$skiptoken=abc',
      '//evil.example/v1.0/users?$skiptoken=abc',
      'http://graph.microsoft.com/v1.0/users',
      'https://graph.microsoft.com.evil.example/v1.0/users',
    ])('refuses the off-origin link %s', (link) => {
      expect(() => checkNextLink(ctx, link, users)).toThrow(/configured Microsoft Graph host/);
    });

    it.each([
      'https://graph.microsoft.com/v1.0/users/x/messages',
      'https://graph.microsoft.com/beta/users',
      'https://graph.microsoft.com/v1.0/groups',
    ])('refuses a link for another collection: %s', (link) => {
      expect(() => checkNextLink(ctx, link, users)).toThrow(/does not belong to this action/);
    });

    it('follows the configured national cloud host', () => {
      const gov = makeContext({ graphBaseUrl: 'https://graph.microsoft.us' }).ctx;
      expect(() =>
        checkNextLink(gov, 'https://graph.microsoft.com/v1.0/users?$skiptoken=a', users)
      ).toThrow(/https:\/\/graph.microsoft.us/);
    });
  });
});
