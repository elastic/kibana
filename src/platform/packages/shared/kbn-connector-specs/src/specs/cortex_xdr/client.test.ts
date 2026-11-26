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
  collectPages,
  CortexXdrError,
  describeHttpError,
  getApiBase,
  isConfirmed,
  retryDelayMs,
  timing,
  vendorErrorText,
  xdrPost,
  xdrRequest,
} from './client';

const API_URL = 'https://api-tenant.xdr.us.paloaltonetworks.com';

const ok = (data: unknown, status = 200, headers: Record<string, string> = {}) => ({
  status,
  data,
  headers,
});

const httpError = (status: number, data: unknown = {}) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data, headers: {} },
  });

const createContext = (apiUrl = API_URL) => {
  const request = jest.fn();
  const ctx = {
    client: { request },
    config: { apiUrl },
    log: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;
  return { ctx, request };
};

describe('Cortex XDR client', () => {
  let sleep: jest.SpyInstance;
  beforeEach(() => {
    sleep = jest.spyOn(timing, 'sleep').mockResolvedValue();
  });
  afterEach(() => jest.restoreAllMocks());

  describe('getApiBase', () => {
    it.each([
      [API_URL, `${API_URL}/public_api/v1`],
      [`${API_URL}/`, `${API_URL}/public_api/v1`],
      [`${API_URL}/public_api/v1`, `${API_URL}/public_api/v1`],
      [`${API_URL}/public_api/v1/`, `${API_URL}/public_api/v1`],
    ])('normalises %s', (apiUrl, expected) => {
      expect(getApiBase(createContext(apiUrl).ctx)).toBe(expected);
    });

    it('fails clearly without an API URL', () => {
      expect(() => getApiBase(createContext('').ctx)).toThrow('no API URL configured');
    });
  });

  describe('xdrRequest', () => {
    it('posts JSON to the tenant route without following redirects, with a 60 s timeout', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(ok({ reply: { a: 1 } }));
      await expect(xdrPost(ctx, '/endpoints/get_policy', { endpoint_id: 'e1' })).resolves.toEqual({
        reply: { a: 1 },
      });
      expect(request).toHaveBeenCalledTimes(1);
      const config = request.mock.calls[0][0];
      expect(config).toMatchObject({
        method: 'POST',
        url: `${API_URL}/public_api/v1/endpoints/get_policy`,
        data: { request_data: { endpoint_id: 'e1' } },
        maxRedirects: 0,
        timeout: 60_000,
      });
      expect(config.validateStatus(302)).toBe(true);
      expect(config.validateStatus(400)).toBe(false);
    });

    it('reports a redirect with its Location instead of following it', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(ok('', 302, { location: 'https://login.example.com/sso' }));
      const error = (await xdrPost(ctx, '/case/search', {}).catch((e) => e)) as CortexXdrError;
      expect(error).toBeInstanceOf(CortexXdrError);
      expect(error.status).toBe(302);
      expect(error.message).toContain('https://login.example.com/sso');
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('retries 429 and 5xx on reads with backoff, then succeeds', async () => {
      const { ctx, request } = createContext();
      request
        .mockRejectedValueOnce(httpError(429))
        .mockRejectedValueOnce(httpError(503))
        .mockResolvedValueOnce(ok({ reply: [] }));
      await expect(xdrPost(ctx, '/case/search', {})).resolves.toEqual({ reply: [] });
      expect(request).toHaveBeenCalledTimes(3);
      expect(sleep).toHaveBeenCalledTimes(2);
    });

    it('gives up after 3 attempts on a rate limit with a clear message', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(429));
      await expect(xdrPost(ctx, '/case/search', {})).rejects.toThrow(
        'Cortex XDR rate limit reached (10 requests per second per tenant); retried 3 times'
      );
      expect(request).toHaveBeenCalledTimes(3);
    });

    it('retries a state-changing call on 429 only, never on 5xx', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValueOnce(httpError(429)).mockResolvedValueOnce(ok({ reply: {} }));
      await xdrPost(ctx, '/endpoints/isolate', {}, { stateChanging: true });
      expect(request).toHaveBeenCalledTimes(2);

      request.mockReset();
      request.mockRejectedValueOnce(httpError(500, { reply: { err_msg: 'boom' } }));
      await expect(xdrPost(ctx, '/endpoints/isolate', {}, { stateChanging: true })).rejects.toThrow(
        'not retried because the action may already have been dispatched'
      );
      expect(request).toHaveBeenCalledTimes(1);
    });

    it.each([400, 401, 402, 403, 404])('raises %s at once without retrying', async (status) => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(status));
      await expect(xdrPost(ctx, '/case/search', {})).rejects.toBeInstanceOf(CortexXdrError);
      expect(request).toHaveBeenCalledTimes(1);
      expect(sleep).not.toHaveBeenCalled();
    });

    it('names the host when Kibana cannot reach it', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValueOnce(
        Object.assign(new Error('getaddrinfo ENOTFOUND'), { isAxiosError: true, code: 'ENOTFOUND' })
      );
      await expect(xdrPost(ctx, '/case/search', {})).rejects.toThrow(
        'Kibana cannot reach the Cortex XDR API host api-tenant.xdr.us.paloaltonetworks.com (ENOTFOUND)'
      );
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('sends GET requests without a body', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(ok([]));
      await xdrRequest(ctx, { method: 'GET', path: '/case/artifacts/5/' });
      expect(request.mock.calls[0][0]).toMatchObject({ method: 'GET', data: undefined });
    });
  });

  describe('error messages', () => {
    it('reads err_msg and err_extra from reply or the top level', () => {
      expect(
        vendorErrorText({ reply: { err_code: 400, err_msg: 'Bad', err_extra: 'field x' } })
      ).toBe('Bad field x');
      expect(vendorErrorText({ err_msg: 'Top' })).toBe('Top');
      expect(vendorErrorText('plain text')).toBe('plain text');
      expect(vendorErrorText(undefined)).toBe('');
    });

    it('truncates long vendor details', () => {
      expect(vendorErrorText({ err_msg: 'x'.repeat(2000) })).toHaveLength(503);
    });

    it('tells 401 (credential) apart from 403 (permission) and 402 (license)', () => {
      expect(describeHttpError(401, {})).toContain('authentication failed');
      expect(describeHttpError(401, {})).toContain('clock');
      expect(describeHttpError(403, { reply: { err_msg: 'denied' } })).toContain(
        'role lacks the permission for this action (HTTP 403): denied'
      );
      expect(describeHttpError(402, {})).toContain('license');
    });

    it('explains a 500 about unknown endpoints on a response action', () => {
      expect(
        describeHttpError(
          500,
          { reply: { err_msg: 'No endpoint was found for creating the requested action' } },
          { stateChanging: true }
        )
      ).toContain('None of the endpoint ids match an endpoint that can run this action');
    });

    it('uses the route-specific 404 message', () => {
      expect(describeHttpError(404, {}, { notFoundMessage: 'No case 7' })).toBe('No case 7');
    });
  });

  it('caps the backoff at 4 s plus jitter', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.999);
    expect(retryDelayMs(1)).toBe(1249);
    expect(retryDelayMs(2)).toBe(2249);
    expect(retryDelayMs(5)).toBe(4249);
  });

  describe('collectPages', () => {
    const page = (start: number, count: number, total: number) =>
      ok({
        reply: {
          total_count: total,
          endpoints: Array.from({ length: count }, (_, i) => ({ endpoint_id: `e${start + i}` })),
        },
      });
    const run = (ctx: ActionContext, searchFrom: number, maxResults: number) =>
      collectPages<{ reply: { total_count: number; endpoints: unknown[] } }>(ctx, {
        path: '/endpoints/get_endpoint',
        requestData: { filters: [{ field: 'platform', operator: 'in', value: ['linux'] }] },
        searchFrom,
        maxResults,
        itemsOf: (body) => body.reply.endpoints,
        totalOf: (body) => body.reply.total_count,
      });

    it('follows pages of 100, re-sending the filters, until maxResults', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(page(0, 100, 1000)).mockResolvedValueOnce(page(100, 100, 1000));
      const result = await run(ctx, 0, 150);
      expect(result.items).toHaveLength(150);
      expect(result.pagesFetched).toBe(2);
      expect(result.nextSearchFrom).toBe(150);
      expect(request.mock.calls.map(([config]) => config.data.request_data)).toEqual([
        {
          filters: [{ field: 'platform', operator: 'in', value: ['linux'] }],
          search_from: 0,
          search_to: 100,
        },
        {
          filters: [{ field: 'platform', operator: 'in', value: ['linux'] }],
          search_from: 100,
          search_to: 150,
        },
      ]);
    });

    it('stops at the vendor total and reports the end with nextSearchFrom null', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(page(200, 100, 300));
      const result = await run(ctx, 200, 500);
      expect(result.pagesFetched).toBe(1);
      expect(result.nextSearchFrom).toBeNull();
    });

    it('stops at a short page', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValueOnce(page(0, 100, 1000)).mockResolvedValueOnce(page(100, 3, 1000));
      const result = await run(ctx, 0, 500);
      expect(result.items).toHaveLength(103);
      expect(result.nextSearchFrom).toBeNull();
      expect(request).toHaveBeenCalledTimes(2);
    });
  });

  it('accepts only a vendor true as a confirmation', () => {
    expect(isConfirmed(true)).toBe(true);
    expect(isConfirmed({ reply: true })).toBe(true);
    expect(isConfirmed(false)).toBe(false);
    expect(isConfirmed({ reply: { err_code: 500 } })).toBe(false);
    expect(isConfirmed('true')).toBe(false);
  });
});
