/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContractRequest } from '../contract/types';
import {
  checkCaptureOptions,
  createCaptureExchange,
  createCaptureWindow,
  REDACTED,
} from './capture_call';
import type { ContractCall } from './create_emulator_fetch';

const request = (overrides: Partial<ContractRequest> = {}): ContractRequest => ({
  method: 'post',
  url: new URL('https://api.example.com/v1/items'),
  query: {},
  headers: {},
  ...overrides,
});

const ok = { statusCode: 200, headers: { 'content-type': 'application/json' }, body: {} };

describe('createCaptureExchange', () => {
  const capture = createCaptureExchange();

  it('redacts credential headers and query parameters, keeping the auth scheme and other values', () => {
    const { request: captured } = capture(
      request({
        headers: {
          Authorization: 'Bearer abc',
          'x-api-key': 'key',
          cookie: 'session=1',
          'content-type': 'application/json',
        },
        query: { access_token: 'abc', limit: '10' },
      }),
      ok
    );

    expect(captured.headers).toEqual({
      Authorization: `Bearer ${REDACTED}`,
      'x-api-key': REDACTED,
      cookie: REDACTED,
      'content-type': 'application/json',
    });
    expect(captured.query).toEqual({ access_token: REDACTED, limit: '10' });
  });

  it('redacts credential keys in JSON bodies at any depth, whatever their case', () => {
    const { request: captured } = capture(
      request({
        headers: { 'content-type': 'application/json' },
        body: {
          name: 'a',
          apiToken: 't',
          credentials: [{ private_key: 'pem', 'Client-Secret': 's', user: 'me' }],
        },
      }),
      ok
    );

    expect(captured.body).toEqual({
      name: 'a',
      apiToken: REDACTED,
      credentials: [{ private_key: REDACTED, 'Client-Secret': REDACTED, user: 'me' }],
    });
  });

  it('parses and redacts form bodies, such as OAuth token requests', () => {
    const { request: captured } = capture(
      request({
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=refresh_token&refresh_token=r&client_id=c&client_secret=s&scope=a&scope=b',
      }),
      ok
    );

    expect(captured.body).toEqual({
      grant_type: 'refresh_token',
      refresh_token: REDACTED,
      client_id: 'c',
      client_secret: REDACTED,
      scope: ['a', 'b'],
    });
  });

  it('redacts JWT bearer assertions', () => {
    const { request: captured } = capture(
      request({
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=jwt',
      }),
      ok
    );

    expect(captured.body).toEqual({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: REDACTED,
    });
  });

  it('redacts the response: issued tokens and cookies', () => {
    const { response } = capture(request(), {
      statusCode: 200,
      headers: { 'content-type': 'application/json', 'set-cookie': 'session=1' },
      body: JSON.stringify({ access_token: 'a', token_type: 'Bearer', expires_in: 3600 }),
    });

    expect(response).toEqual({
      headers: { 'content-type': 'application/json', 'set-cookie': REDACTED },
      body: { access_token: REDACTED, token_type: 'Bearer', expires_in: 3600 },
    });
  });

  it('redacts the keys given in redact too, matched the same way', () => {
    const { request: captured } = createCaptureExchange({ redact: ['key', 'signingKey'] })(
      request({
        query: { key: 'k', 'x-signing-key': 's', keyword: 'kept' },
      }),
      ok
    );

    expect(captured.query).toEqual({ key: REDACTED, 'x-signing-key': REDACTED, keyword: 'kept' });
  });

  it('cuts bodies longer than maxBodyBytes, after redacting, and flags them', () => {
    const { request: captured } = createCaptureExchange({ maxBodyBytes: 16 })(
      request({
        headers: { 'content-type': 'application/json' },
        body: { password: 'a long secret value', note: 'x' },
      }),
      ok
    );

    expect(captured.body).toBe('{"password":"[re');
    expect(captured.bodyTruncated).toBe(true);
  });

  it('keeps text bodies as text and leaves out empty ones', () => {
    const { request: captured, response } = capture(
      request({ headers: { 'content-type': 'text/plain' }, body: 'token=abc' }),
      { statusCode: 204 }
    );

    expect(captured.body).toBe('token=abc');
    expect(response).toEqual({ headers: {} });
  });
});

describe('createCaptureExchange redaction scope', () => {
  const capture = createCaptureExchange();

  it('keeps pagination cursors readable', () => {
    const { request: captured } = capture(
      request({
        query: { page_token: 'p', pageToken: 'p', nextToken: 'n', continuation_token: 'c' },
      }),
      ok
    );

    expect(captured.query).toEqual({
      page_token: 'p',
      pageToken: 'p',
      nextToken: 'n',
      continuation_token: 'c',
    });
  });

  it('redacts credential tokens and keys by name', () => {
    const { request: captured } = capture(
      request({
        headers: {
          'x-amz-security-token': 's',
          'dd-application-key': 'a',
          'x-auth-token': 't',
          'proxy-authorization': 'Basic dXNlcjpwYXNz',
        },
        query: { token: 't', key: 'kept', id_token: 'i' },
      }),
      ok
    );

    expect(captured.headers).toEqual({
      'x-amz-security-token': REDACTED,
      'dd-application-key': REDACTED,
      'x-auth-token': REDACTED,
      'proxy-authorization': `Basic ${REDACTED}`,
    });
    expect(captured.query).toEqual({ token: REDACTED, key: 'kept', id_token: REDACTED });
  });

  it('redacts an auth header without a scheme whole', () => {
    const { request: captured } = capture(request({ headers: { authorization: 'abc' } }), ok);

    expect(captured.headers).toEqual({ authorization: REDACTED });
  });
});

describe('createCaptureWindow', () => {
  const call = (description: string, captured = true): ContractCall => ({
    request: description,
    status: 200,
    requestViolations: [],
    responseViolations: [],
    ...(captured
      ? { captured: { request: { headers: {}, query: {} }, response: { headers: {} } } }
      : {}),
  });

  it('keeps captures on the latest calls only, leaving the calls in place', () => {
    const calls = [call('a'), call('b', false), call('c'), call('d')];
    const window = createCaptureWindow(calls, 2);
    [0, 2, 3].forEach(window.add);

    expect(
      calls.map(({ request: description, captured }) => [description, Boolean(captured)])
    ).toEqual([
      ['a', false],
      ['b', false],
      ['c', true],
      ['d', true],
    ]);
  });

  it('forgets noted calls when cleared', () => {
    const calls = [call('a'), call('b')];
    const window = createCaptureWindow(calls, 1);
    window.add(0);
    window.clear();
    window.add(1);

    expect(calls.every(({ captured }) => captured !== undefined)).toBe(true);
  });

  it('returns with a limit below 0, dropping every capture', () => {
    const calls = [call('a')];
    createCaptureWindow(calls, -1).add(0);

    expect(calls[0].captured).toBeUndefined();
  });
});

describe('createCaptureExchange with the spec’s credential names', () => {
  const capture = createCaptureExchange({}, { headers: ['X-Figma-Token'], query: ['key'] });

  it('redacts them, whatever they are called, where the spec declares them', () => {
    const { request: captured } = capture(
      request({
        headers: { 'x-figma-token': 'f', key: 'kept', 'content-type': 'application/json' },
        query: { key: 'k', keyword: 'kept' },
        body: { key: 'kept' },
      }),
      ok
    );

    expect(captured).toEqual({
      headers: { 'x-figma-token': REDACTED, key: 'kept', 'content-type': 'application/json' },
      query: { key: REDACTED, keyword: 'kept' },
      body: { key: 'kept' },
    });
  });
});

describe('checkCaptureOptions', () => {
  it.each([
    { maxCalls: -1 },
    { maxCalls: 1.5 },
    { maxCalls: Number.NaN },
    { maxBodyBytes: -1 },
    { maxBodyBytes: Number.POSITIVE_INFINITY },
  ])('rejects %p', (options) => {
    expect(() => checkCaptureOptions(options)).toThrow('must be a whole number of at least 0');
  });

  it('accepts 0 and leaving them out', () => {
    expect(() => checkCaptureOptions({ maxCalls: 0, maxBodyBytes: 0 })).not.toThrow();
    expect(() => checkCaptureOptions({})).not.toThrow();
  });
});
