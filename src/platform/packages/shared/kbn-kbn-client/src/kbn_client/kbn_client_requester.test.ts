/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import { KbnClientRequester, pathWithSpace, redactUrl } from './kbn_client_requester';
import { KbnClientRequesterError } from './kbn_client_requester_error';

describe('KBN Client Requester Functions', () => {
  it('pathWithSpace() adds a space to the path', () => {
    expect(pathWithSpace('hello')`/foo/bar`).toMatchInlineSnapshot(`"/s/hello/foo/bar"`);
  });

  it('pathWithSpace() ignores the space when it is empty', () => {
    expect(pathWithSpace(undefined)`/foo/bar`).toMatchInlineSnapshot(`"/foo/bar"`);
    expect(pathWithSpace('')`/foo/bar`).toMatchInlineSnapshot(`"/foo/bar"`);
  });

  it('pathWithSpace() ignores the space when it is the default space', () => {
    expect(pathWithSpace('default')`/foo/bar`).toMatchInlineSnapshot(`"/foo/bar"`);
  });

  it('pathWithSpace() uriencodes variables in the path', () => {
    expect(pathWithSpace('space')`hello/${'funky/username🏴‍☠️'}`).toMatchInlineSnapshot(
      `"/s/space/hello/funky%2Fusername%F0%9F%8F%B4%E2%80%8D%E2%98%A0%EF%B8%8F"`
    );
  });

  it('pathWithSpace() ensures the path always starts with a slash', () => {
    expect(pathWithSpace('foo')`hello/world`).toMatchInlineSnapshot(`"/s/foo/hello/world"`);
    expect(pathWithSpace()`hello/world`).toMatchInlineSnapshot(`"/hello/world"`);
  });

  it(`redactUrl() takes a string such as 'http://some-user:some-password@localhost:5620' and returns the url without the auth info`, () => {
    expect(
      redactUrl(
        'http://testing-internal:someawesomepassword@localhost:5620/internal/ftr/kbn_client_so/task/serverless-security%3Anlp-cleanup-task%3A1.0.0'
      )
    ).toEqual(
      'http://localhost:5620/internal/ftr/kbn_client_so/task/serverless-security%3Anlp-cleanup-task%3A1.0.0'
    );
  });
});

describe('KbnClientRequester.request()', () => {
  const log = new ToolingLog();
  const fetchMock = jest.spyOn(global, 'fetch');

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Sibling FTR-test consumers read `error.status` on the caught error. Pin
  // the contract so we notice if it regresses again.
  it('throws KbnClientRequesterError with .status on non-2xx', async () => {
    // `mockImplementation` rather than `mockResolvedValue` so each retry/call
    // gets a fresh Response — fetch's Response body is single-consume.
    fetchMock.mockImplementation(
      async () =>
        new Response(JSON.stringify({ statusCode: 404, message: 'not found' }), { status: 404 })
    );

    const requester = new KbnClientRequester(log, { url: 'http://localhost:5620' });

    let caught: unknown;
    try {
      await requester.request({ method: 'GET', path: '/api/missing', retries: 0 });
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(KbnClientRequesterError);
    expect((caught as KbnClientRequesterError).status).toBe(404);
    // The thrown error has the rich message format that includes status text +
    // response body (FTR error logs depend on this).
    expect((caught as Error).message).toMatch(/404/);
  });

  // The fetch wrapper must NOT JSON.stringify FormData / streams, and must
  // NOT override the caller's content-type when they pass one (otherwise
  // multipart uploads hit `415 Unsupported Media Type`).
  it('passes FormData bodies through without JSON serialization', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const requester = new KbnClientRequester(log, { url: 'http://localhost:5620' });
    const form = new FormData();
    form.append('file', new Blob(['hello'], { type: 'text/plain' }), 'hello.txt');

    await requester.request({ method: 'POST', path: '/api/upload', body: form, retries: 0 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.body).toBe(form);
    // We never set `content-type: application/json` when the body is FormData;
    // fetch fills in the multipart boundary automatically.
    const headers = init.headers as Record<string, string>;
    expect(headers['content-type']).toBeUndefined();
  });

  // FTR connector tests (http.ts / webhook.ts) call `kbnClient.resolveUrl()`
  // and then `extractCredentialsFromUrl()` on the result. Strip credentials
  // from the URL we pass to fetch but keep them on the public `resolveUrl()`.
  it('resolveUrl() keeps user:pass credentials in the URL', () => {
    const requester = new KbnClientRequester(log, {
      url: 'http://elastic:changeme@localhost:5620',
    });
    expect(requester.resolveUrl('/api/foo')).toBe('http://elastic:changeme@localhost:5620/api/foo');
  });

  it('strips credentials from the URL passed to fetch and forwards them as Basic auth', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const requester = new KbnClientRequester(log, {
      url: 'http://elastic:changeme@localhost:5620',
    });
    await requester.request({ method: 'GET', path: '/api/foo', retries: 0 });

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('elastic:changeme');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    // 'elastic:changeme' base64-encoded is 'ZWxhc3RpYzpjaGFuZ2VtZQ=='
    expect(headers.Authorization).toBe('Basic ZWxhc3RpYzpjaGFuZ2VtZQ==');
  });

  // 429s and other retry-after responses send the hint as a `Retry-After` HTTP header.
  // Consumers (kbn-evals retry loop) need `.headers` on the thrown error to honor it.
  it('attaches response headers to KbnClientRequesterError on non-2xx', async () => {
    fetchMock.mockResolvedValue(
      new Response('rate limited', {
        status: 429,
        headers: { 'retry-after': '42' },
      })
    );

    const requester = new KbnClientRequester(log, { url: 'http://localhost:5620' });

    let caught: unknown;
    try {
      await requester.request({ method: 'GET', path: '/api/foo', retries: 0 });
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(KbnClientRequesterError);
    expect((caught as KbnClientRequesterError).status).toBe(429);
    expect((caught as KbnClientRequesterError).headers?.get('retry-after')).toBe('42');
  });

  // `ignoreErrors: [404]` is heavily used by FTR API services (e.g.
  // Scout's data_views.get) that destructure `.data` from the response.
  // axios returned the body even on the ignored status; preserve that so
  // `response.data.foo` access on a 404 doesn't throw.
  it('returns parsed body on a non-2xx status listed in ignoreErrors', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: 'not found', data_view: null }), { status: 404 })
    );

    const requester = new KbnClientRequester(log, { url: 'http://localhost:5620' });
    const result = await requester.request<{ message: string; data_view: unknown }>({
      method: 'GET',
      path: '/api/data_views/data_view/missing',
      ignoreErrors: [404],
      retries: 0,
    });

    expect(result.status).toBe(404);
    expect(result.data.message).toBe('not found');
    expect(result.data.data_view).toBeNull();
  });

  it('JSON-encodes plain object bodies and sets content-type', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const requester = new KbnClientRequester(log, { url: 'http://localhost:5620' });
    await requester.request({
      method: 'POST',
      path: '/api/save',
      body: { hello: 'world' },
      retries: 0,
    });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.body).toBe(JSON.stringify({ hello: 'world' }));
    const headers = init.headers as Record<string, string>;
    expect(headers['content-type']).toBe('application/json');
  });
});

describe('KbnClientRequester transport configuration', () => {
  const log = new ToolingLog();

  interface AgentConfiguration {
    headersTimeout?: number;
    bodyTimeout?: number;
    connect?: { timeout?: number; rejectUnauthorized?: boolean };
  }

  // undici exposes no public accessor for a dispatcher's resolved configuration —
  // it is stored under a module-private `options` symbol. Read that symbol off the
  // dispatcher instance itself rather than off a separately imported `Agent`, since
  // module identity is not guaranteed to match (see `isolateModules` below).
  const dispatcherOf = (requester: KbnClientRequester): object =>
    (requester as unknown as { dispatcher: object }).dispatcher;

  const dispatcherConfiguration = (dispatcher: object): AgentConfiguration => {
    const optionsSymbol = Object.getOwnPropertySymbols(dispatcher).find(
      (symbol) => symbol.description === 'options'
    );
    if (!optionsSymbol) {
      throw new Error('undici dispatcher does not expose an `options` symbol');
    }
    return (dispatcher as Record<symbol, AgentConfiguration>)[optionsSymbol];
  };

  const configurationOf = (requester: KbnClientRequester): AgentConfiguration =>
    dispatcherConfiguration(dispatcherOf(requester));

  const requesterFor = (url: string) => new KbnClientRequester(log, { url });

  // The timeout constants are read at module load, so the environment has to be
  // set before the module is (re)loaded. An `undefined` value unsets the
  // variable rather than passing the string "undefined", which is what the
  // defaulting tests need when the ambient environment already sets a timeout.
  const loadRequesterWithEnv = (env: Record<string, string | undefined>) => {
    const previousEnv = { ...process.env };
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    let loaded!: typeof import('./kbn_client_requester');
    jest.isolateModules(() => {
      loaded =
        jest.requireActual<typeof import('./kbn_client_requester')>('./kbn_client_requester');
    });
    process.env = previousEnv;
    return loaded.KbnClientRequester;
  };

  // The dispatcher used to be created only for the `https:` protocol, which left
  // `http:` callers (a local Kibana) on undici's unconfigurable 300s default.
  it('creates the dispatcher for both http and https', () => {
    expect(configurationOf(requesterFor('http://localhost:5620'))).toBeDefined();
    expect(configurationOf(requesterFor('https://localhost:5620'))).toBeDefined();
  });

  it('applies undici-compatible defaults: 60s connect, 300s headers/body', () => {
    // Load a fresh copy with both timeout variables explicitly unset: this
    // suite may legitimately run where the ambient environment configures a
    // different budget, and the file-level import would then be evaluated with
    // that budget instead of the defaults under test.
    const Requester = loadRequesterWithEnv({
      KBN_CLIENT_HEADERS_TIMEOUT_MS: undefined,
      KBN_CLIENT_BODY_TIMEOUT_MS: undefined,
    });

    expect(configurationOf(new Requester(log, { url: 'http://localhost:5620' }))).toMatchObject({
      headersTimeout: 300_000,
      bodyTimeout: 300_000,
      connect: { timeout: 60_000 },
    });
  });

  it('keeps the TLS options on the https path only', () => {
    expect(configurationOf(requesterFor('https://localhost:5620')).connect).toMatchObject({
      rejectUnauthorized: false,
    });
    expect(configurationOf(requesterFor('http://localhost:5620')).connect).not.toHaveProperty(
      'rejectUnauthorized'
    );
  });

  it('honours KBN_CLIENT_HEADERS_TIMEOUT_MS and KBN_CLIENT_BODY_TIMEOUT_MS', () => {
    const Requester = loadRequesterWithEnv({
      KBN_CLIENT_HEADERS_TIMEOUT_MS: '900000',
      KBN_CLIENT_BODY_TIMEOUT_MS: '900000',
    });

    expect(configurationOf(new Requester(log, { url: 'http://localhost:5620' }))).toMatchObject({
      headersTimeout: 900_000,
      bodyTimeout: 900_000,
    });
  });

  // An explicit `0` is undici's documented way of disabling `headersTimeout` /
  // `bodyTimeout`, so it must survive the env parsing rather than being
  // collapsed into the 300s default by a falsy-check fallback.
  it('lets an explicitly configured 0 disable the headers and body timeouts', () => {
    const Requester = loadRequesterWithEnv({
      KBN_CLIENT_HEADERS_TIMEOUT_MS: '0',
      KBN_CLIENT_BODY_TIMEOUT_MS: '0',
    });

    expect(configurationOf(new Requester(log, { url: 'http://localhost:5620' }))).toMatchObject({
      headersTimeout: 0,
      bodyTimeout: 0,
    });
  });

  it('falls back to the defaults for empty or unparsable timeout values', () => {
    const Empty = loadRequesterWithEnv({
      KBN_CLIENT_HEADERS_TIMEOUT_MS: '',
      KBN_CLIENT_BODY_TIMEOUT_MS: '',
    });
    expect(configurationOf(new Empty(log, { url: 'http://localhost:5620' }))).toMatchObject({
      headersTimeout: 300_000,
      bodyTimeout: 300_000,
    });

    const Garbage = loadRequesterWithEnv({
      KBN_CLIENT_HEADERS_TIMEOUT_MS: 'not-a-number',
      KBN_CLIENT_BODY_TIMEOUT_MS: 'not-a-number',
    });
    expect(configurationOf(new Garbage(log, { url: 'http://localhost:5620' }))).toMatchObject({
      headersTimeout: 300_000,
      bodyTimeout: 300_000,
    });
  });

  // The configuration assertions above read the dispatcher off the requester
  // instance; none of them would notice `request()` failing to hand that
  // dispatcher to `fetch`, which would silently put every HTTP request back on
  // undici's global timeout defaults. Assert the request boundary itself.
  it('passes the configured dispatcher to fetch for http requests', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    try {
      const requester = requesterFor('http://localhost:5620');
      await requester.request({ method: 'GET', path: '/api/foo', retries: 0 });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const init = fetchMock.mock.calls[0][1] as RequestInit & { dispatcher?: object };
      expect(init.dispatcher).toBe(dispatcherOf(requester));
      // ...and it is the configured Agent, not an arbitrary object: the connect
      // timeout is the one value that is not env-overridable.
      expect(dispatcherConfiguration(init.dispatcher!)).toMatchObject({
        connect: { timeout: 60_000 },
      });
    } finally {
      fetchMock.mockRestore();
    }
  });
});
