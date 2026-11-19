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
  DEFAULT_API_URL,
  MAX_ATTEMPTS,
  MAX_TOTAL_RETRY_WAIT_MS,
  MDE_CLOUDS,
  MdeApiError,
  assertCloudConsistency,
  getApiUrl,
  getCloudConsistencyError,
  isActionConflict,
  isBaseApiUrl,
  isResourceNotFound,
  isSecureUrl,
  mdeList,
  mdeRequest,
  parseConflictingActionRef,
  parseRetryAfter,
  retryTiming,
  toBareUserName,
  valueOf,
  withoutODataContext,
} from './client';

const API_URL = 'https://api.securitycenter.microsoft.com/api';

export const httpError = (
  status: number,
  data: unknown = {},
  headers: Record<string, string> = {}
) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data, headers, statusText: '' },
  });

const createContext = (
  config: Record<string, unknown> = { apiUrl: API_URL },
  secrets: Record<string, unknown> = {}
) => {
  const request = jest.fn();
  const ctx = {
    client: { request },
    config,
    secrets: { authType: 'oauth_client_credentials', ...secrets },
    log: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() },
  } as unknown as ActionContext;
  return { ctx, request };
};

describe('Microsoft Defender for Endpoint client', () => {
  let sleep: jest.SpyInstance;

  beforeEach(() => {
    sleep = jest.spyOn(retryTiming, 'sleep').mockResolvedValue(undefined);
  });

  afterEach(() => {
    sleep.mockRestore();
  });

  describe('getApiUrl', () => {
    it('trims trailing slashes and falls back to the commercial API URL', () => {
      expect(getApiUrl(createContext({ apiUrl: `${API_URL}//` }).ctx)).toBe(API_URL);
      expect(getApiUrl(createContext({}).ctx)).toBe(DEFAULT_API_URL);
      expect(getApiUrl(createContext({ apiUrl: '  ' }).ctx)).toBe(DEFAULT_API_URL);
    });
  });

  describe('Defender cloud', () => {
    it.each([
      ['commercial', 'https://api.security.microsoft.com/api'],
      ['commercial-eu', 'https://eu.api.security.microsoft.com/api'],
      ['gcc', 'https://api-gcc.securitycenter.microsoft.us/api'],
      ['gcc-high', 'https://api-gov.securitycenter.microsoft.us/api'],
      ['dod', 'https://api-gov.securitycenter.microsoft.us/api'],
    ])('uses the API host of %s when no custom API URL is set', (cloud, expected) => {
      expect(getApiUrl(createContext({ cloud }).ctx)).toBe(expected);
    });

    it('prefers a custom API URL over the cloud host', () => {
      expect(getApiUrl(createContext({ cloud: 'gcc', apiUrl: 'http://localhost:18080' }).ctx)).toBe(
        'http://localhost:18080'
      );
    });

    it('accepts a token URL, scope and API URL of the selected cloud', () => {
      const gov = MDE_CLOUDS['gcc-high'];
      const { ctx } = createContext(
        { cloud: 'gcc-high', apiUrl: gov.apiUrl },
        { tokenUrl: 'https://login.microsoftonline.us/t/oauth2/v2.0/token', scope: gov.scope }
      );
      expect(() => assertCloudConsistency(ctx)).not.toThrow();
    });

    it('accepts hosts it does not know, such as a test server or a proxy', () => {
      const { ctx } = createContext(
        { cloud: 'dod', apiUrl: 'http://localhost:18080' },
        { tokenUrl: 'http://localhost:18080/t/oauth2/v2.0/token', scope: 'api://custom/.default' }
      );
      expect(() => assertCloudConsistency(ctx)).not.toThrow();
    });

    it('names every mismatch with the selected cloud', () => {
      const { ctx } = createContext(
        { cloud: 'gcc-high', apiUrl: 'https://api.securitycenter.microsoft.com/api' },
        {
          tokenUrl: 'https://login.microsoftonline.com/t/oauth2/v2.0/token',
          scope: MDE_CLOUDS.commercial.scope,
        }
      );
      expect(() => assertCloudConsistency(ctx)).toThrow(
        /"gcc-high".*API URL host api\.securitycenter\.microsoft\.com.*login\.microsoftonline\.us.*scope must be https:\/\/api-gov/
      );
    });

    it('fails a request before calling the API when the cloud does not match', async () => {
      const { ctx, request } = createContext(
        { cloud: 'gcc' },
        { scope: MDE_CLOUDS['gcc-high'].scope }
      );
      await expect(
        mdeRequest(ctx, { method: 'GET', path: '/machines', permission: 'Machine.Read.All' })
      ).rejects.toThrow(/Defender cloud is "gcc"/);
      expect(request).not.toHaveBeenCalled();
    });
  });

  describe('isActionConflict', () => {
    it.each([
      ['ActiveRequestAlreadyExists', 'pending'],
      ['BadRequest', 'Action is already in progress'],
      [undefined, 'There is a pending machine action'],
      [
        'BadRequest',
        'Cannot isolate device because Isolate action: 172ba902-c562-42c6-a025-3637dda40563 is still active.',
      ],
      [
        'BadRequest',
        'Cannot unisolate device because Unisolate action: 32624541-4c43-44ef-a152-e80fd70d019d is still active.',
      ],
    ])('detects code %s / message %s', async (code, message) => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(400, { error: { code, message } }));
      const error = await mdeRequest(ctx, {
        method: 'POST',
        path: '/machines/x/isolate',
        permission: 'Machine.Isolate',
      }).catch((e: unknown) => e);
      expect(isActionConflict(error)).toBe(true);
      expect((error as Error).message).toContain('Another action of this kind is already pending');
    });

    it('ignores other 400s', () => {
      expect(isActionConflict(new MdeApiError('HTTP 400 InvalidInput: bad', 400, 'Bad'))).toBe(
        false
      );
    });

    it('parses the pending action named in the live message', () => {
      expect(
        parseConflictingActionRef(
          'Microsoft Defender for Endpoint POST /machines/abc/isolate failed (HTTP 400 BadRequest: Cannot isolate device because Isolate action: 172BA902-c562-42c6-a025-3637dda40563 is still active.).'
        )
      ).toEqual({ id: '172ba902-c562-42c6-a025-3637dda40563', type: 'Isolate' });
      expect(parseConflictingActionRef('Action is already in progress')).toBeUndefined();
    });
  });

  describe('mdeRequest', () => {
    it('sends the request to the configured API URL and returns the body', async () => {
      const { ctx, request } = createContext({ apiUrl: 'http://localhost:18080' });
      request.mockResolvedValue({ data: { id: 'a' } });

      await expect(
        mdeRequest(ctx, { method: 'GET', path: '/machines/abc', permission: 'Machine.Read.All' })
      ).resolves.toEqual({ id: 'a' });
      expect(request).toHaveBeenCalledWith({
        method: 'GET',
        url: 'http://localhost:18080/machines/abc',
        params: undefined,
        data: undefined,
        maxRedirects: 0,
      });
    });

    it('refuses a plain http API URL to a non-loopback host before sending the token', async () => {
      const { ctx, request } = createContext({ apiUrl: 'http://proxy.example.com/api' });

      await expect(
        mdeRequest(ctx, { method: 'GET', path: '/machines', permission: 'Machine.Read.All' })
      ).rejects.toThrow(/must use https/);
      expect(request).not.toHaveBeenCalled();
    });

    it('refuses a saved API URL with a query string or fragment before any request', async () => {
      for (const apiUrl of [
        'https://proxy.example.com/api?tenant=a',
        'https://proxy.example.com/api#x',
      ]) {
        const { ctx, request } = createContext({ apiUrl });

        await expect(
          mdeRequest(ctx, { method: 'GET', path: '/machines', permission: 'Machine.Read.All' })
        ).rejects.toThrow(/query string or fragment/);
        expect(request).not.toHaveBeenCalled();
      }
    });

    it('refuses a plain http token URL to a non-loopback host before requesting a token', async () => {
      for (const tokenUrl of [
        'http://login.microsoftonline.com/t/oauth2/v2.0/token',
        'http://proxy.example.com/t/oauth2/v2.0/token',
      ]) {
        const { ctx, request } = createContext(undefined, { tokenUrl });

        await expect(
          mdeRequest(ctx, { method: 'GET', path: '/machines', permission: 'Machine.Read.All' })
        ).rejects.toThrow(/token URL must use https/);
        expect(request).not.toHaveBeenCalled();
      }
    });

    it('accepts a plain http token URL to a loopback host', async () => {
      const { ctx, request } = createContext(undefined, {
        tokenUrl: 'http://localhost:18080/t/oauth2/v2.0/token',
      });
      request.mockResolvedValue({ data: { value: [] } });

      await expect(
        mdeRequest(ctx, { method: 'GET', path: '/machines', permission: 'Machine.Read.All' })
      ).resolves.toEqual({ value: [] });
    });

    it('does not follow a redirect and reports it as a failure', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValueOnce(httpError(302, {}));

      await expect(
        mdeRequest(ctx, { method: 'GET', path: '/machines', permission: 'Machine.Read.All' })
      ).rejects.toThrow(/HTTP 302/);
      expect(request).toHaveBeenCalledTimes(1);
      expect(request.mock.calls[0][0].maxRedirects).toBe(0);
    });

    it('retries a 429 for a POST, waiting for Retry-After', async () => {
      const { ctx, request } = createContext();
      request
        .mockRejectedValueOnce(httpError(429, {}, { 'retry-after': '3' }))
        .mockResolvedValueOnce({ data: { id: 'action-1' } });

      await expect(
        mdeRequest(ctx, {
          method: 'POST',
          path: '/machines/abc/isolate',
          permission: 'Machine.Isolate',
          idempotent: false,
        })
      ).resolves.toEqual({ id: 'action-1' });
      expect(request).toHaveBeenCalledTimes(2);
      expect(sleep).toHaveBeenCalledWith(3000);
    });

    it('backs off exponentially when a 429 has no Retry-After', async () => {
      const { ctx, request } = createContext();
      request
        .mockRejectedValueOnce(httpError(429))
        .mockRejectedValueOnce(httpError(429))
        .mockResolvedValueOnce({ data: {} });

      await mdeRequest(ctx, { method: 'GET', path: '/alerts', permission: 'Alert.ReadWrite.All' });
      expect(sleep.mock.calls).toEqual([[1000], [2000]]);
    });

    it(`gives up after ${MAX_ATTEMPTS} attempts and reports the rate limit`, async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(429, {}, { 'retry-after': '1' }));

      await expect(
        mdeRequest(ctx, { method: 'GET', path: '/alerts', permission: 'Alert.ReadWrite.All' })
      ).rejects.toThrow(/HTTP 429.*rate limit was reached\. Retry after 1 s\./);
      expect(request).toHaveBeenCalledTimes(MAX_ATTEMPTS);
    });

    it('fails at once when Retry-After is longer than the retry cap', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(429, {}, { 'retry-after': '3600' }));

      await expect(
        mdeRequest(ctx, { method: 'GET', path: '/alerts', permission: 'Alert.ReadWrite.All' })
      ).rejects.toThrow(/Retry after 3600 s/);
      expect(request).toHaveBeenCalledTimes(1);
      expect(sleep).not.toHaveBeenCalled();
    });

    it(`stops retrying once the total wait would pass ${MAX_TOTAL_RETRY_WAIT_MS} ms`, async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(429, {}, { 'retry-after': '20' }));

      await expect(
        mdeRequest(ctx, { method: 'GET', path: '/alerts', permission: 'Alert.ReadWrite.All' })
      ).rejects.toThrow(/HTTP 429.*Retry after 20 s/);
      expect(request).toHaveBeenCalledTimes(2);
      expect(sleep.mock.calls).toEqual([[20000]]);
    });

    it('retries a 5xx for a GET', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValueOnce(httpError(503)).mockResolvedValueOnce({ data: { ok: 1 } });

      await expect(
        mdeRequest(ctx, { method: 'GET', path: '/machines', permission: 'Machine.Read.All' })
      ).resolves.toEqual({ ok: 1 });
      expect(request).toHaveBeenCalledTimes(2);
    });

    it('never retries a 5xx for a non-idempotent POST (the action could start twice)', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(500, { error: { code: 'InternalServerError' } }));

      await expect(
        mdeRequest(ctx, {
          method: 'POST',
          path: '/machines/abc/runliveresponse',
          permission: 'Machine.LiveResponse',
          idempotent: false,
        })
      ).rejects.toThrow(/HTTP 500 InternalServerError/);
      expect(request).toHaveBeenCalledTimes(1);
    });

    it.each([400, 401, 403, 404])('never retries a %s', async (status) => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(status));

      await expect(
        mdeRequest(ctx, { method: 'GET', path: '/machines', permission: 'Machine.Read.All' })
      ).rejects.toBeInstanceOf(MdeApiError);
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('does not retry a transport error with no response', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(new Error('socket hang up'));

      await expect(
        mdeRequest(ctx, { method: 'GET', path: '/machines', permission: 'Machine.Read.All' })
      ).rejects.toThrow('Microsoft Defender for Endpoint request failed: socket hang up');
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('says to request fewer records when the response is over the size limit', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(new Error('maxContentLength size of 1048576 exceeded'));

      await expect(
        mdeRequest(ctx, { method: 'GET', path: '/machines', permission: 'Machine.Read.All' })
      ).rejects.toThrow(
        'Microsoft Defender for Endpoint request failed: maxContentLength size of 1048576 exceeded. The response is larger than the Kibana response size limit (xpack.actions.maxResponseContentLength): request fewer records with top.'
      );
    });
  });

  describe('error messages', () => {
    const run = async (error: unknown) => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(error);
      return mdeRequest(ctx, {
        method: 'POST',
        path: '/machines/abc/isolate',
        permission: 'Machine.Isolate',
        idempotent: false,
      }).catch((e: MdeApiError) => e);
    };

    it('keeps the vendor code, message, and status', async () => {
      const error = (await run(
        httpError(404, {
          error: { code: 'ResourceNotFound', message: 'Machine abc was not found' },
        })
      )) as MdeApiError;

      expect(error.message).toBe(
        'Microsoft Defender for Endpoint POST /machines/abc/isolate failed (HTTP 404 ResourceNotFound: Machine abc was not found).'
      );
      expect(error.status).toBe(404);
      expect(error.code).toBe('ResourceNotFound');
      expect(isResourceNotFound(error)).toBe(true);
    });

    it('does not treat a 404 without ResourceNotFound (for example a wrong API path) as not found', async () => {
      const error = await run(httpError(404, '<html>Not Found</html>'));
      expect(error).toBeInstanceOf(MdeApiError);
      expect((error as MdeApiError).status).toBe(404);
      expect(isResourceNotFound(error)).toBe(false);
    });

    it('explains a 401 as a rejected token', async () => {
      const error = await run(httpError(401, { error: { code: 'Unauthorized', message: 'x' } }));
      expect((error as Error).message).toMatch(/access token was rejected/);
      expect((error as Error).message).not.toMatch(/permission/);
    });

    it('explains a 403 with the permission the call needs', async () => {
      const error = await run(httpError(403, { error: { code: 'Forbidden', message: 'x' } }));
      expect((error as Error).message).toMatch(/application permission Machine\.Isolate/);
      expect((error as Error).message).not.toMatch(/access token was rejected/);
    });

    it('explains a 403 "No active license" as a cloud or license problem, not a permission', async () => {
      const error = await run(
        httpError(403, {
          error: {
            code: 'Unauthorized',
            message: 'Unauthorized request - No active license found',
          },
        })
      );
      expect((error as Error).message).toMatch(/no Microsoft Defender for Endpoint license/);
      expect((error as Error).message).toMatch(/Defender cloud/);
      expect((error as Error).message).not.toMatch(/application permission/);
    });

    it('explains InvalidDefenderRunningMode', async () => {
      const error = (await run(
        httpError(400, {
          error: {
            code: 'InvalidDefenderRunningMode',
            message: 'Invalid Windows Defender Anti-Virus running mode: 4',
          },
        })
      )) as MdeApiError;
      expect(error.code).toBe('InvalidDefenderRunningMode');
      expect(error.message).toMatch(/Microsoft Defender Antivirus in active mode/);
      expect(isActionConflict(error)).toBe(false);
    });

    it('keeps the role Microsoft names in a 403', async () => {
      const error = await run(
        httpError(403, {
          error: {
            code: 'Forbidden',
            message:
              'Missing application roles. API required roles: Library.Manage, application roles: Machine.Read.All',
          },
        })
      );
      expect((error as Error).message).toMatch(/API required roles: Library\.Manage/);
    });

    it('explains ActiveRequestAlreadyExists', async () => {
      const error = await run(
        httpError(400, { error: { code: 'ActiveRequestAlreadyExists', message: 'pending' } })
      );
      expect((error as Error).message).toMatch(/cancelAction/);
    });
  });

  describe('mdeList', () => {
    it('asks for a default page of 100 and omits $skip on the first page', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ data: { value: [{ id: 1 }] } });

      await expect(
        mdeList(ctx, '/machines', {}, { permission: 'Machine.Read.All' })
      ).resolves.toEqual({
        value: [{ id: 1 }],
        count: 1,
        hasMore: false,
      });
      expect(request.mock.calls[0][0].params).toEqual({ $filter: undefined, $top: 100 });
    });

    it('decides hasMore by the full-page rule when the API sends no @odata.nextLink', async () => {
      const { ctx, request } = createContext();
      request
        .mockResolvedValueOnce({ data: { value: [{ id: 1 }, { id: 2 }] } })
        .mockResolvedValueOnce({ data: { value: [{ id: 3 }] } })
        .mockResolvedValueOnce({ data: { value: [] } });

      const list = (skip: number) =>
        mdeList(ctx, '/machineactions', { top: 2, skip }, { permission: 'Machine.ReadWrite.All' });

      await expect(list(0)).resolves.toEqual({
        value: [{ id: 1 }, { id: 2 }],
        count: 2,
        hasMore: true,
        nextSkip: 2,
      });
      await expect(list(2)).resolves.toEqual({ value: [{ id: 3 }], count: 1, hasMore: false });
      await expect(list(4)).resolves.toEqual({ value: [], count: 0, hasMore: false });
    });

    it('reports the next skip when the page is full or the API returns @odata.nextLink', async () => {
      const { ctx, request } = createContext();
      const nextLink = `${API_URL}/machines?$top=2&$skip=4`;
      request
        .mockResolvedValueOnce({ data: { value: [{ id: 1 }, { id: 2 }] } })
        .mockResolvedValueOnce({ data: { value: [{ id: 3 }], '@odata.nextLink': nextLink } });

      await expect(
        mdeList(
          ctx,
          '/machines',
          { top: 2, skip: 2, filter: "healthStatus eq 'Active'" },
          {
            permission: 'Machine.Read.All',
          }
        )
      ).resolves.toEqual({ value: [{ id: 1 }, { id: 2 }], count: 2, hasMore: true, nextSkip: 4 });
      expect(request.mock.calls[0][0].params).toEqual({
        $filter: "healthStatus eq 'Active'",
        $top: 2,
        $skip: 2,
      });

      await expect(
        mdeList(ctx, '/machines', { top: 2, skip: 4 }, { permission: 'Machine.Read.All' })
      ).resolves.toEqual({ value: [{ id: 3 }], count: 1, hasMore: true, nextSkip: 5, nextLink });
      // The connector never requests the continuation URL itself.
      expect(request).toHaveBeenCalledTimes(2);
    });
  });

  describe('helpers', () => {
    it('accepts https URLs and plain http only to a loopback host', () => {
      expect(isSecureUrl('https://api.security.microsoft.com/api')).toBe(true);
      expect(isSecureUrl('https://proxy.example.com:8443/api')).toBe(true);
      expect(isSecureUrl('http://localhost:18080')).toBe(true);
      expect(isSecureUrl('http://127.0.0.1:18080/api')).toBe(true);
      expect(isSecureUrl('http://[::1]:18080/api')).toBe(true);
      expect(isSecureUrl('http://api.security.microsoft.com/api')).toBe(false);
      expect(isSecureUrl('http://localhost.example.com/api')).toBe(false);
      expect(isSecureUrl('ftp://api.security.microsoft.com/api')).toBe(false);
    });

    it('accepts a custom API URL only without a query string or fragment', () => {
      expect(isBaseApiUrl('https://proxy.example.com/api')).toBe(true);
      expect(isBaseApiUrl('https://proxy.example.com/api/')).toBe(true);
      expect(isBaseApiUrl('https://proxy.example.com/api?tenant=a')).toBe(false);
      expect(isBaseApiUrl('https://proxy.example.com/api?')).toBe(false);
      expect(isBaseApiUrl('https://proxy.example.com/api#x')).toBe(false);
    });

    it('parses Retry-After seconds and HTTP dates', () => {
      expect(parseRetryAfter('5')).toBe(5000);
      expect(parseRetryAfter(0)).toBe(0);
      expect(parseRetryAfter(undefined)).toBeUndefined();
      expect(parseRetryAfter('not a date')).toBeUndefined();
      const inTenSeconds = new Date(Date.now() + 10_000).toUTCString();
      expect(parseRetryAfter(inTenSeconds)).toBeGreaterThan(8000);
    });

    it('drops @odata.context and wraps collections', () => {
      expect(withoutODataContext({ '@odata.context': 'x', id: 1 })).toEqual({ id: 1 });
      expect(valueOf({ value: [1, 2] })).toEqual({ value: [1, 2], count: 2 });
      expect(valueOf(undefined)).toEqual({ value: [], count: 0 });
      expect(valueOf({ value: [1], '@odata.nextLink': 'https://x/api/next' })).toEqual({
        value: [1],
        count: 1,
        truncated: true,
        nextLink: 'https://x/api/next',
      });
    });

    it.each([
      ['user1', 'user1'],
      ['user1@contoso.com', 'user1'],
      ['CONTOSO\\user1', 'user1'],
      ['CONTOSO\\user1@contoso.com', 'user1'],
    ])('reduces %s to the bare user name %s', (input, expected) => {
      expect(toBareUserName(input)).toBe(expected);
    });
  });

  describe('getCloudConsistencyError', () => {
    const validate = getCloudConsistencyError;
    const govTokenUrl = 'https://login.microsoftonline.us/tenant/oauth2/v2.0/token';
    const govScope = 'https://api-gov.securitycenter.microsoft.us/.default';

    it('rejects a token URL of another cloud, so the token is never requested there', () => {
      expect(
        validate(
          { cloud: 'gcc-high', apiUrl: 'http://localhost:18080' },
          {
            authType: 'oauth_client_credentials',
            tokenUrl: 'https://login.microsoftonline.com/tenant/oauth2/v2.0/token',
            scope: 'https://api.securitycenter.microsoft.com/.default',
          }
        )
      ).toMatch(
        /Defender cloud is "gcc-high".*token URL must be https:\/\/login\.microsoftonline\.us\/<tenant ID>\/oauth2\/v2\.0\/token.*scope must be https:\/\/api-gov\.securitycenter\.microsoft\.us\/\.default\./
      );
    });

    it('treats a missing cloud as commercial and rejects a US Government token URL and scope', () => {
      expect(validate({}, { tokenUrl: govTokenUrl, scope: govScope })).toMatch(
        /Defender cloud is "commercial".*token URL must be https:\/\/login\.microsoftonline\.com\/.*scope must be https:\/\/api\.securitycenter\.microsoft\.com\/\.default\./
      );
    });

    it('never echoes the token URL or the scope from the secrets in the message', () => {
      const tokenUrl = 'https://login.microsoftonline.com/my-tenant-1234/oauth2/v2.0/token';
      const scope = 'https://api.securitycenter.microsoft.com/custom-scope-5678/.default';
      const message = validate({ cloud: 'gcc' }, { tokenUrl, scope });
      expect(message).toMatch(/Defender cloud is "gcc"/);
      expect(message).not.toContain('my-tenant-1234');
      expect(message).not.toContain('custom-scope-5678');
      expect(message).not.toContain('login.microsoftonline.com');
    });

    it('rejects an API URL of another cloud', () => {
      expect(
        validate(
          { cloud: 'commercial', apiUrl: 'https://api-gov.securitycenter.microsoft.us/api' },
          {
            tokenUrl: 'https://login.microsoftonline.com/tenant/oauth2/v2.0/token',
            scope: 'https://api.securitycenter.microsoft.com/.default',
          }
        )
      ).toMatch(/API URL host api-gov\.securitycenter\.microsoft\.us belongs to another cloud/);
    });

    it('accepts a matching cloud, token URL and scope, for either auth type', () => {
      for (const authType of [
        'oauth_client_credentials',
        'oauth_client_credentials_private_key_jwt',
      ]) {
        expect(
          validate({ cloud: 'dod' }, { authType, tokenUrl: govTokenUrl, scope: govScope })
        ).toBeNull();
      }
    });

    it('accepts hosts it does not know, such as a test server', () => {
      expect(
        validate(
          { cloud: 'gcc-high', apiUrl: 'http://localhost:18080/api' },
          { tokenUrl: 'http://localhost:18080/tenant/oauth2/v2.0/token', scope: govScope }
        )
      ).toBeNull();
    });
  });
});
