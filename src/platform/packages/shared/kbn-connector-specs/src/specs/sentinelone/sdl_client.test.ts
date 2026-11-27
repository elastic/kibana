/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AxiosHeaders } from 'axios';
import type { ActionContext } from '../../connector_spec';
import { timers } from './client';
import { redactToken, sdlRequest, toHeaderRecord, toLegacyErrorBody } from './sdl_client';

const CONSOLE = 'https://tenant.sentinelone.net';
const TOKEN = 'unit-test-token-abcde';
const TAG = 'Kt7sUZeZS3x3PN3Am7Nb3zyuL3py4cE_wJfXNm/13uM-';

const request = jest.fn();
const ctx = {
  client: { request },
  config: { url: CONSOLE },
  secrets: { authType: 'api_key_header', token: TOKEN },
  log: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() },
} as unknown as ActionContext;

const httpError = (status: number, data: unknown, headers: Record<string, string> = {}) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, statusText: '', data, headers },
  });

const launch = () =>
  sdlRequest(ctx, {
    action: 'runQuery',
    method: 'POST',
    path: '/queries',
    body: { queryType: 'PQ' },
    mutating: true,
  });

/** Runs the launch, expects it to fail, and checks the message never carries the token. */
const launchError = async (): Promise<string> => {
  const error = await launch().then(
    () => {
      throw new Error('expected the request to fail');
    },
    (err: Error) => err
  );
  expect(error.message).not.toContain(TOKEN);
  expect(error.message).not.toContain(TOKEN.slice(-5));
  return error.message;
};

let sleep: jest.SpyInstance;
beforeEach(() => {
  request.mockReset();
  sleep = jest.spyOn(timers, 'sleep').mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('sdlRequest', () => {
  it('sends the stored token as Bearer to /sdl/v2/api on the console host and returns the headers', async () => {
    request.mockResolvedValue({
      status: 200,
      data: { id: 'v2.abc' },
      headers: new AxiosHeaders({ 'X-Dataset-Query-Forward-Tag': TAG, 'x-ratelimit-limit': '8' }),
    });
    await expect(
      sdlRequest(ctx, {
        action: 'runQuery',
        method: 'GET',
        path: '/queries/v2.abc',
        params: { lastStepSeen: 1 },
        headers: { 'X-Dataset-Query-Forward-Tag': TAG },
        mutating: false,
      })
    ).resolves.toEqual({
      data: { id: 'v2.abc' },
      headers: { 'x-dataset-query-forward-tag': TAG, 'x-ratelimit-limit': '8' },
    });
    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      url: `${CONSOLE}/sdl/v2/api/queries/v2.abc`,
      params: { lastStepSeen: 1 },
      headers: {
        'X-Dataset-Query-Forward-Tag': TAG,
        Authorization: `Bearer ${TOKEN}`,
        token: false,
      },
      timeout: 60_000,
    });
  });

  it('accepts a token stored with the ApiToken prefix and still sends Bearer', async () => {
    const prefixed = { ...ctx, secrets: { token: `ApiToken ${TOKEN}` } } as ActionContext;
    request.mockResolvedValue({ status: 204, data: '', headers: {} });
    await sdlRequest(prefixed, {
      action: 'runQuery',
      method: 'DELETE',
      path: '/queries/v2.abc',
      mutating: false,
    });
    expect(request.mock.calls[0][0].headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it('maps every error shape of the query service to the connector error format without the token', async () => {
    // 400 {code, message, details[]}: tests/final/replacement_probe/sdl_launch_bad_time.json
    request.mockRejectedValueOnce(
      httpError(400, {
        code: 'invalid_argument',
        message: "field=[timeRange] error=[Error: invalid startTime: Can't parse date [banana]]",
        details: [
          { field: 'timeRange', message: "Error: invalid startTime: Can't parse date [banana]" },
        ],
      })
    );
    expect(await launchError()).toBe(
      "Status code: 400. Message: API Error [Bad Request] invalid_argument field=[timeRange] error=[Error: invalid startTime: Can't parse date [banana]] timeRange: Error: invalid startTime: Can't parse date [banana]"
    );

    // 401 {message, status}: sdl_launch_wrong_token.json; the service echoes the token tail
    request.mockRejectedValueOnce(
      httpError(401, {
        message: `Couldn't decode API token ...${TOKEN.slice(-5)}.`,
        status: 'error/client/badParam',
      })
    );
    expect(await launchError()).toBe(
      "Status code: 401. Message: Unauthorized API Error (401) error/client/badParam Couldn't decode API token ...[redacted].. Check the API token and the tenant URL"
    );

    // 500: a JSON object followed by an HTML error page (replacement_probe_run1/sdl_launch_pq.json)
    request.mockRejectedValueOnce(
      httpError(
        500,
        '{\n  "message": "Header must start with Bearer, but actually starts with \\"ApiTok\\"",\n  "status": "error/client/badParam"\n}<!DOCTYPE html><html lang="en"><head><title>Error</title><script type="module" src="https://cdn.example/index.js"></script></head><body>Error</body></html>',
        { 'content-type': 'text/html;charset=UTF-8' }
      )
    );
    const html500 = await launchError();
    expect(html500).toBe(
      'Status code: 500. Message: API Error [Internal Server Error] error/client/badParam Header must start with Bearer, but actually starts with "ApiTok"'
    );

    // 500 with an HTML page only, echoing the token: plain text, token removed
    request.mockRejectedValueOnce(
      httpError(500, `<html><body><h1>Error</h1><p>bad header Bearer ${TOKEN}</p></body></html>`)
    );
    expect(await launchError()).toBe(
      'Status code: 500. Message: API Error [Internal Server Error] Error bad header Bearer [redacted]'
    );

    // 404 after delete: poll_after_delete.json
    request.mockRejectedValueOnce(
      httpError(404, { code: 'not_found', message: 'Requested token=3c25 not found.', details: [] })
    );
    expect(await launchError()).toBe(
      'Status code: 404. Message: API Error [Not Found] not_found Requested token=3c25 not found.'
    );

    // 403 keeps the connector hint
    request.mockRejectedValueOnce(httpError(403, { code: 'permission_denied', message: 'Denied' }));
    expect(await launchError()).toContain('permission_denied Denied. Grant the permission');
    expect(request).toHaveBeenCalledTimes(6);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('retries the launch once on 429 honoring Retry-After, but not on 502 (it is treated as state-changing)', async () => {
    request
      .mockRejectedValueOnce(
        httpError(
          429,
          { code: 'rate_limited', message: 'Too many', details: [] },
          { 'retry-after': '3' }
        )
      )
      .mockResolvedValueOnce({ status: 200, data: { id: 'v2.abc' }, headers: {} });
    await expect(launch()).resolves.toEqual({ data: { id: 'v2.abc' }, headers: {} });
    expect(request).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(3_000);

    request.mockReset();
    request.mockRejectedValueOnce(httpError(502, ''));
    expect(await launchError()).toBe('Status code: 502. Message: API Error [Bad Gateway] ');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('reports a network failure without the token', async () => {
    request.mockRejectedValueOnce(
      Object.assign(new Error(`connect ECONNREFUSED (Bearer ${TOKEN})`), {
        isAxiosError: true,
        code: 'ECONNREFUSED',
      })
    );
    expect(await launchError()).toBe(
      'SentinelOne runQuery request failed: connect ECONNREFUSED (Bearer [redacted])'
    );
  });
});

describe('helpers', () => {
  it('redacts the token and an echoed token tail', () => {
    expect(redactToken(`x ${TOKEN} y`, TOKEN)).toBe('x [redacted] y');
    expect(redactToken("Couldn't decode API token ...xxxxx.", TOKEN)).toBe(
      "Couldn't decode API token ...[redacted]."
    );
  });

  it('normalizes bodies and headers', () => {
    expect(toLegacyErrorBody(undefined, TOKEN)).toBeUndefined();
    expect(toLegacyErrorBody('', TOKEN)).toBeUndefined();
    expect(toLegacyErrorBody({ unexpected: true }, TOKEN)).toBe('{"unexpected":true}');
    expect(
      toLegacyErrorBody(new TextEncoder().encode('{"message":"m","status":"s"}'), TOKEN)
    ).toEqual({ errors: [{ code: 's', title: 'm', detail: undefined }] });
    expect(toHeaderRecord({ 'X-Rate': 5, other: ['a'] })).toEqual({ 'x-rate': '5' });
    expect(toHeaderRecord(undefined)).toEqual({});
  });
});
