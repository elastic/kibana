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
  downloadFile,
  getAuthHeaders,
  getConsoleOrigin,
  s1Request,
  timers,
  toQuery,
  toSentinelOneError,
  toVendorParamName,
} from './client';
import { mergeStarRule, starRuleScopeFilter } from './star_rule';

const request = jest.fn();
const makeCtx = (config: Record<string, unknown>, secrets: Record<string, unknown>) =>
  ({
    client: { request },
    config,
    secrets,
    log: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() },
  } as unknown as ActionContext);
const ctx = makeCtx(
  { url: 'https://tenant.sentinelone.net/' },
  { authType: 'api_key_header', token: 'tok' }
);

const httpError = (status: number, data: unknown = {}, headers: Record<string, string> = {}) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, statusText: '', data, headers },
  });

let sleep: jest.SpyInstance;
beforeEach(() => {
  request.mockReset();
  sleep = jest.spyOn(timers, 'sleep').mockResolvedValue(undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('config and auth', () => {
  it('normalises the tenant URL to its origin', () => {
    expect(getConsoleOrigin(ctx)).toBe('https://tenant.sentinelone.net');
    expect(getConsoleOrigin(makeCtx({ url: 'https://t.sentinelone.net/web/api/v2.1' }, {}))).toBe(
      'https://t.sentinelone.net'
    );
  });

  it('rejects a missing or invalid tenant URL', () => {
    expect(() => getConsoleOrigin(makeCtx({}, {}))).toThrow('missing the required tenant URL');
    expect(() => getConsoleOrigin(makeCtx({ url: 'not a url' }, {}))).toThrow('not a valid URL');
    expect(() => getConsoleOrigin(makeCtx({ url: 'ftp://t.example' }, {}))).toThrow('https');
  });

  it('requires https, except for a loopback host', () => {
    expect(() => getConsoleOrigin(makeCtx({ url: 'http://t.sentinelone.net' }, {}))).toThrow(
      'must use https'
    );
    expect(getConsoleOrigin(makeCtx({ url: 'https://t.sentinelone.net' }, {}))).toBe(
      'https://t.sentinelone.net'
    );
    expect(getConsoleOrigin(makeCtx({ url: 'http://localhost:18080' }, {}))).toBe(
      'http://localhost:18080'
    );
    expect(getConsoleOrigin(makeCtx({ url: 'http://127.0.0.1:18080/' }, {}))).toBe(
      'http://127.0.0.1:18080'
    );
  });

  it('sends Authorization: ApiToken and suppresses the raw token header', () => {
    expect(getAuthHeaders(ctx)).toEqual({ Authorization: 'ApiToken tok', token: false });
    expect(getAuthHeaders(makeCtx({}, { token: 'ApiToken tok ' }))).toEqual({
      Authorization: 'ApiToken tok',
      token: false,
    });
    expect(() => getAuthHeaders(makeCtx({}, {}))).toThrow('missing the API token');
  });
});

describe('query encoding', () => {
  it('joins arrays with commas, drops undefined and maps operator inputs to vendor names', () => {
    expect(
      toQuery({
        ids: ['1', '2'],
        empty: [],
        limit: 5,
        skip: undefined,
        createdAtGte: '2026-01-01T00:00:00Z',
        valueContains: ['a', 'b'],
      })
    ).toEqual(
      Object.fromEntries([
        ['ids', '1,2'],
        ['limit', 5],
        ['createdAt__gte', '2026-01-01T00:00:00Z'],
        ['value__contains', 'a,b'],
      ])
    );
    expect(toVendorParamName('computerName__contains')).toBe('computerName__contains');
    expect(toVendorParamName('computerName')).toBe('computerName');
  });

  it('drops blank strings so an unset workflow variable is not sent as an empty filter', () => {
    expect(toQuery({ computerName: 'host-1', ip: '', query: '   ', limit: 1 })).toEqual({
      computerName: 'host-1',
      limit: 1,
    });
    expect(toQuery({ ip: '' })).toEqual({});
  });
});

describe('retry policy', () => {
  const read = () =>
    s1Request(ctx, { action: 'getAgents', method: 'GET', path: '/agents', mutating: false });
  const write = () =>
    s1Request(ctx, {
      action: 'initiateScan',
      method: 'POST',
      path: '/agents/actions/initiate-scan',
      body: { filter: { ids: ['1'] } },
      mutating: true,
    });

  it('retries a read on 503 and honours Retry-After (capped at 30 s)', async () => {
    request
      .mockRejectedValueOnce(httpError(503, {}, { 'retry-after': '120' }))
      .mockRejectedValueOnce(httpError(429, {}, { 'retry-after': '2' }))
      .mockResolvedValueOnce({ status: 200, data: { data: [] } });
    await expect(read()).resolves.toEqual({ data: [] });
    expect(request).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([30_000, 2_000]);
  });

  it('uses exponential backoff with jitter without Retry-After', async () => {
    request
      .mockRejectedValueOnce(httpError(502))
      .mockRejectedValueOnce(httpError(504))
      .mockResolvedValueOnce({ status: 200, data: {} });
    await read();
    const [first, second] = sleep.mock.calls.map(([ms]) => ms);
    expect(first).toBeGreaterThanOrEqual(2_000);
    expect(first).toBeLessThan(2_500);
    expect(second).toBeGreaterThanOrEqual(5_000);
    expect(second).toBeLessThan(5_500);
  });

  it('gives up after 3 attempts with the rate-limit message', async () => {
    request.mockRejectedValue(httpError(429));
    await expect(read()).rejects.toThrow(
      'SentinelOne rate limit reached for getAgents; try again later'
    );
    expect(request).toHaveBeenCalledTimes(3);
  });

  it('retries a state-changing call on 429 only', async () => {
    request.mockRejectedValueOnce(httpError(429)).mockResolvedValueOnce({ status: 200, data: {} });
    await write();
    expect(request).toHaveBeenCalledTimes(2);

    request.mockReset();
    request.mockRejectedValueOnce(httpError(503));
    await expect(write()).rejects.toThrow(
      'Status code: 503. Message: API Error [Service Unavailable]'
    );
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('never retries a timeout or network error', async () => {
    request.mockRejectedValueOnce(
      Object.assign(new Error('timeout of 60000ms exceeded'), {
        isAxiosError: true,
        code: 'ECONNABORTED',
      })
    );
    await expect(read()).rejects.toThrow(
      'SentinelOne getAgents request failed: timed out after 60 s'
    );
    expect(request).toHaveBeenCalledTimes(1);
  });

  it.each([400, 401, 403, 404, 409, 422])('does not retry %s', async (status) => {
    request.mockRejectedValueOnce(httpError(status));
    await expect(read()).rejects.toThrow(`Status code: ${status}`);
    expect(request).toHaveBeenCalledTimes(1);
  });
});

describe('error messages', () => {
  const body = {
    errors: [{ code: 4000010, title: 'Validation Error', detail: 'limit too large' }],
  };

  it.each([
    [
      400,
      'Status code: 400. Message: API Error [Bad Request] 4000010 Validation Error limit too large',
    ],
    [
      403,
      'Status code: 403. Message: API Error [Forbidden] 4000010 Validation Error limit too large. Grant the permission listed for this action',
    ],
    [
      404,
      'Status code: 404. Message: API Error [Not Found] 4000010 Validation Error limit too large',
    ],
    [
      409,
      'Status code: 409. Message: API Error [Conflict] 4000010 Validation Error limit too large',
    ],
    [
      451,
      'Status code: 451. Message: API Error [Unavailable For Legal Reasons] 4000010 Validation Error limit too large',
    ],
  ])('maps %s to the V1 message shape', (status, message) => {
    expect(toSentinelOneError('getAgents', httpError(status, body)).message).toBe(message);
  });

  it('decodes an error body returned as bytes', () => {
    const bytes = new TextEncoder().encode(JSON.stringify(body)).buffer;
    expect(toSentinelOneError('downloadAgentFile', httpError(404, bytes)).message).toContain(
      'limit too large'
    );
  });

  it('reports an over-cap JSON response without truncating', () => {
    const error = Object.assign(new Error('maxContentLength size of 26214400 exceeded'), {
      isAxiosError: true,
    });
    expect(toSentinelOneError('getAgents', error).message).toContain(
      'xpack.actions.maxResponseContentLength'
    );
  });
});

describe('downloadFile', () => {
  const ok = (text: string) => ({
    status: 200,
    data: new TextEncoder().encode(text).buffer,
    headers: {},
  });

  it('sends the token only to the console origin, never to another host or an http downgrade', async () => {
    request
      .mockResolvedValueOnce({
        status: 302,
        data: new ArrayBuffer(0),
        headers: { location: 'http://tenant.sentinelone.net/x' },
      })
      .mockResolvedValueOnce(ok('a'));
    await downloadFile(ctx, {
      action: 'downloadThreatFile',
      link: 'https://tenant.sentinelone.net/f',
    });
    expect(request.mock.calls[0][0].headers).toEqual({
      Authorization: 'ApiToken tok',
      token: false,
    });
    expect(request.mock.calls[1][0].headers).toEqual({ Authorization: false, token: false });
  });

  it('strips credentials for a protocol-relative link to another host', async () => {
    request.mockResolvedValueOnce(ok('a'));
    await downloadFile(ctx, { action: 'downloadThreatFile', link: '//evil.example/file' });
    expect(request.mock.calls[0][0].url).toBe('https://evil.example/file');
    expect(request.mock.calls[0][0].headers).toEqual({ Authorization: false, token: false });
  });

  it('refuses non-http links and endless redirects', async () => {
    await expect(downloadFile(ctx, { action: 'x', link: 'file:///etc/passwd' })).rejects.toThrow(
      'unsupported download link protocol'
    );
    request.mockResolvedValue({
      status: 302,
      data: new ArrayBuffer(0),
      headers: { location: '/loop' },
    });
    await expect(downloadFile(ctx, { action: 'x', link: '/start' })).rejects.toThrow(
      'too many redirects'
    );
  });

  it('fails a body over 25 MB even when the transport did not enforce the cap', async () => {
    request.mockResolvedValueOnce({
      status: 200,
      data: new ArrayBuffer(25 * 1024 * 1024 + 1),
      headers: {},
    });
    await expect(downloadFile(ctx, { action: 'x', link: '/f' })).rejects.toThrow(
      'File larger than 25 MB; download it from the SentinelOne console'
    );
  });
});

describe('STAR rule merge', () => {
  it('keeps every PUT field of the current rule and drops read-only fields', () => {
    expect(
      mergeStarRule(
        { id: '1', name: 'a', severity: 'Low', hideLogic: true, createdAt: 'x', creator: 'y' },
        { severity: 'High', name: undefined }
      )
    ).toEqual({ name: 'a', severity: 'High', hideLogic: true });
  });

  it.each([
    [{ scope: 'tenant' }, { tenant: true }],
    [{ scope: 'account', scopeId: '5' }, { accountIds: ['5'] }],
    [{ scope: 'site', scopeId: ['8', '9'] }, { siteIds: ['8', '9'] }],
    [{ scope: 'global', scopeId: null }, { tenant: true }],
    [{ scope: 'site', siteId: '6' }, { siteIds: ['6'] }],
    [{ scope: 'group', scopeId: '7' }, { groupIds: ['7'] }],
  ])('rebuilds the scope filter from %j', (rule, filter) => {
    expect(starRuleScopeFilter(rule)).toEqual(filter);
  });

  it('refuses to update a rule whose scope is unknown', () => {
    expect(() => starRuleScopeFilter({ id: '1' })).toThrow('cannot determine the scope');
  });
});
