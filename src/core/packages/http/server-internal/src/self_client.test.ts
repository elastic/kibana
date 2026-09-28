/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { NEVER } from 'rxjs';
import type { IAuthHeadersStorage, KibanaRequest } from '@kbn/core-http-server';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { AuthHeadersStorage } from './auth_headers_storage';
import type { HttpConfig } from './http_config';
import {
  createInternalHttpSelfClient,
  SELF_CALL_MTLS_ERROR,
  SELF_CALL_RECURSION_ERROR,
  type SelfClientUiamAttestationGetter,
} from './self_client';

const originalFetch = global.fetch;

const createRequest = (overrides: Partial<KibanaRequest> = {}): KibanaRequest =>
  ({
    basePath: '/base/s/my-space',
    events: {
      aborted$: NEVER,
      completed$: NEVER,
    },
    headers: {},
    route: {
      method: 'post',
      path: '/internal/source/{sourceId}',
      options: {},
    },
    url: new URL('https://source.example/base/s/my-space/internal/source/private-source-id'),
    ...overrides,
  } as KibanaRequest);

const createFakeRequest = (headers: Record<string, string> = {}, spaceId?: string): KibanaRequest =>
  mockRouter.createFakeKibanaRequest({ headers, spaceId });

const createClient = ({
  publicBaseUrl = 'https://kibana.example.com/base',
  authHeaders = { authorization: 'test-auth-token' },
  authRequestHeaders: suppliedAuthRequestHeaders,
  target = 'auto',
  getHttpConfig = jest.fn().mockReturnValue({
    ssl: { enabled: false, requestCert: false },
    selfHttp: { ssl: { verificationMode: 'full' } },
  } as HttpConfig),
  serverProtocol = 'http',
  getUiamAttestationGetter,
}: {
  publicBaseUrl?: string | null;
  authHeaders?: Record<string, string>;
  authRequestHeaders?: IAuthHeadersStorage;
  target?: 'auto' | 'local';
  getHttpConfig?: jest.MockedFunction<() => HttpConfig>;
  serverProtocol?: 'http' | 'https';
  getUiamAttestationGetter?: () => SelfClientUiamAttestationGetter | undefined;
} = {}) => {
  const authRequestHeaders =
    suppliedAuthRequestHeaders ??
    ({
      get: jest.fn().mockReturnValue(authHeaders),
      set: jest.fn(),
    } as jest.Mocked<IAuthHeadersStorage>);
  const log = loggingSystemMock.createLogger();

  const self = createInternalHttpSelfClient({
    authRequestHeaders,
    basePath: {
      publicBaseUrl: publicBaseUrl ?? undefined,
      serverBasePath: '/base',
      get: jest.fn(),
      prepend: jest.fn(),
      remove: jest.fn(),
    },
    getServerInfo: jest.fn().mockReturnValue({
      name: 'kibana',
      hostname: '0.0.0.0',
      port: 5601,
      protocol: serverProtocol,
    }),
    getHttpConfig,
    kibanaVersion: '9.9.9',
    log,
    target,
    getUiamAttestationGetter,
  });

  return { authRequestHeaders, getHttpConfig, log, self };
};

describe('InternalHttpSelfScopedClient', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          headers: { 'content-type': 'application/json' },
        })
      )
    );
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('supports buffered raw bodies and rejects streams', async () => {
    const { self } = createClient();
    await self.asScoped(createRequest()).fetch('/api/upload', {
      method: 'POST',
      rawBody: new URLSearchParams({ value: 'one' }),
    });
    const request = (global.fetch as jest.Mock).mock.calls[0][0] as Request;
    expect(request.headers.get('content-type')).toContain('application/x-www-form-urlencoded');
    await expect(
      self.asScoped(createRequest()).fetch('/api/upload', {
        method: 'POST',
        rawBody: new ReadableStream(),
      } as any)
    ).rejects.toThrow();
  });

  it('uses the local listener when a call explicitly targets local', async () => {
    const { self } = createClient({ publicBaseUrl: 'https://public.example.com/base' });
    await self.asScoped(createRequest()).fetch('/api/status', { target: 'local' });
    const request = (global.fetch as jest.Mock).mock.calls[0][0] as Request;
    expect(request.url).toBe('http://localhost:5601/base/s/my-space/api/status');
  });

  it('calls publicBaseUrl with request base path, query, auth headers, and self markers', async () => {
    const { authRequestHeaders, self } = createClient();
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    const result = await self.asScoped(createRequest()).fetch('/api/status', {
      query: { foo: 'bar', multi: ['one', 'two'] },
    });

    expect(result).toEqual({ ok: true });
    expect(authRequestHeaders.get).toHaveBeenCalled();

    const request = (global.fetch as jest.Mock).mock.calls[0][0] as Request;
    expect(request.url).toBe(
      'https://kibana.example.com/base/s/my-space/api/status?foo=bar&multi=one&multi=two'
    );
    expect(request.headers.get('authorization')).toBe('test-auth-token');
    expect(request.headers.get('kbn-version')).toBe('9.9.9');
    expect(request.headers.get('x-kbn-self-call')).toBe('true');
    expect(request.headers.has(X_ELASTIC_INTERNAL_ORIGIN_REQUEST)).toBe(false);
    expect(request.headers.get('user-agent')).toBe('KibanaSelfHttpClient/9.9.9');
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 60_000);
    setTimeoutSpy.mockRestore();
  });

  it('logs the effective local target for a per-call local override', async () => {
    const { log, self } = createClient({ publicBaseUrl: 'https://public.example.com/base' });
    await self.asScoped(createRequest()).fetch('/api/status', { target: 'local' });
    expect(log.debug).toHaveBeenCalledWith(expect.any(Function), {
      labels: expect.objectContaining({ self_http_target_mode: 'local' }),
    });
  });

  it('logs only the source route template and methods plus the target mode', async () => {
    const { log, self } = createClient();

    await self.asScoped(createRequest()).fetch('/api/private-target/private-target-id', {
      method: 'PATCH',
      query: { sensitive: 'private-query-value' },
      body: { sensitive: 'private-body-value' },
      headers: { 'x-private-header': 'private-header-value' },
    });

    expect(log.debug).toHaveBeenCalledWith(expect.any(Function), {
      labels: {
        self_http_source_method: 'POST',
        self_http_source_route_template: '/internal/source/{sourceId}',
        self_http_target_method: 'PATCH',
        self_http_target_mode: 'public',
      },
    });
    const [[message]] = (log.debug as jest.Mock).mock.calls;
    expect(message()).toBe('Kibana scoped self HTTP call attempted');
    const serializedLog = JSON.stringify((log.debug as jest.Mock).mock.calls);
    expect(serializedLog).not.toContain('private-source-id');
    expect(serializedLog).not.toContain('private-target');
    expect(serializedLog).not.toContain('private-query-value');
    expect(serializedLog).not.toContain('private-body-value');
    expect(serializedLog).not.toContain('private-header-value');
  });

  it('safely logs attempts made from a fake Kibana request', async () => {
    const { log, self } = createClient();
    const request = createFakeRequest();

    expect(request.isFakeRequest).toBe(true);
    await self.asScoped(request).fetch('/api/private-target/private-target-id');

    expect(log.debug).toHaveBeenCalledWith(expect.any(Function), {
      labels: {
        self_http_source_method: 'GET',
        self_http_source_route_template: '/',
        self_http_target_method: 'GET',
        self_http_target_mode: 'public',
      },
    });
    const serializedLog = JSON.stringify((log.debug as jest.Mock).mock.calls);
    expect(serializedLog).not.toContain('private-target');
    expect(serializedLog).not.toContain('fake-request');
  });

  it('logs a connect failure with the origin, mode, and underlying TLS cause', async () => {
    const { log, self } = createClient();
    const tlsCause = Object.assign(new Error("Hostname/IP does not match certificate's altnames"), {
      code: 'ERR_TLS_CERT_ALTNAME_INVALID',
    });
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      Object.assign(new Error('fetch failed'), { cause: tlsCause })
    );

    await expect(self.asScoped(createRequest()).fetch('/api/status')).rejects.toMatchObject({
      name: 'HttpSelfFetchError',
      message:
        "Kibana self HTTP call failed: GET https://kibana.example.com: ERR_TLS_CERT_ALTNAME_INVALID: Hostname/IP does not match certificate's altnames",
      cause: expect.objectContaining({ message: 'fetch failed', cause: tlsCause }),
    });
    expect(log.error).toHaveBeenCalledWith(
      'Kibana scoped self HTTP call failed',
      expect.objectContaining({
        error: expect.objectContaining({
          message:
            "Kibana self HTTP call failed: GET https://kibana.example.com: ERR_TLS_CERT_ALTNAME_INVALID: Hostname/IP does not match certificate's altnames",
          name: 'HttpSelfFetchError',
          cause: expect.objectContaining({
            name: 'Error',
            cause: expect.objectContaining({
              name: 'Error',
              code: 'ERR_TLS_CERT_ALTNAME_INVALID',
              message: "Hostname/IP does not match certificate's altnames",
            }),
          }),
        }),
        http: { request: { method: 'GET' } },
        labels: {
          self_http_target_method: 'GET',
          self_http_target_mode: 'public',
          self_http_target_origin: 'https://kibana.example.com',
          self_http_error_code: 'ERR_TLS_CERT_ALTNAME_INVALID',
        },
      })
    );
    expect(JSON.stringify((log.error as jest.Mock).mock.calls)).not.toContain('my-space');
  });

  it('logs a non-success response with status and omits the path and query', async () => {
    const { log, self } = createClient();
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'nope' }), {
        status: 502,
        headers: { 'content-type': 'application/json' },
      })
    );

    await expect(
      self
        .asScoped(createRequest())
        .fetch('/api/items/raw-id', { query: { token: 'secret-query' } })
    ).rejects.toThrow('Kibana self HTTP call failed: GET https://kibana.example.com → 502');
    expect(log.error).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalledWith(
      'Kibana scoped self HTTP call failed',
      expect.objectContaining({
        http: { request: { method: 'GET' }, response: { status_code: 502 } },
        labels: expect.objectContaining({
          self_http_target_origin: 'https://kibana.example.com',
          self_http_status_class: '5xx',
        }),
      })
    );
    const serializedLog = JSON.stringify((log.warn as jest.Mock).mock.calls);
    expect(serializedLog).not.toContain('secret-query');
    expect(serializedLog).not.toContain('raw-id');
    expect(serializedLog).not.toContain('nope');
  });

  it('does not log outbound client-error statuses', async () => {
    const { log, self } = createClient();
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'missing' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      })
    );

    await expect(self.asScoped(createRequest()).fetch('/api/status')).rejects.toThrow(
      'Kibana self HTTP call failed: GET https://kibana.example.com → 404'
    );
    expect(log.warn).not.toHaveBeenCalled();
    expect(log.error).not.toHaveBeenCalled();
  });

  it('warns on a raw 5xx response without throwing', async () => {
    const { log, self } = createClient();
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'nope' }), {
        status: 502,
        headers: { 'content-type': 'application/json' },
      })
    );

    await expect(
      self.asScoped(createRequest()).fetch('/api/status', { asResponse: true, rawResponse: true })
    ).resolves.toEqual(
      expect.objectContaining({
        response: expect.objectContaining({ status: 502 }),
      })
    );
    expect(log.error).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalledWith(
      'Kibana scoped self HTTP call failed',
      expect.objectContaining({
        http: { request: { method: 'GET' }, response: { status_code: 502 } },
      })
    );
  });

  it('does not treat a name-colliding error as a self-fetch error', async () => {
    const { log, self } = createClient();
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      Object.assign(new Error('boom'), { name: 'HttpSelfFetchError' })
    );

    await expect(self.asScoped(createRequest()).fetch('/api/status')).rejects.toEqual(
      expect.objectContaining({
        name: 'HttpSelfFetchError',
        message: expect.stringContaining('Kibana self HTTP call failed'),
        request: expect.any(Request),
      })
    );
    expect(log.error).toHaveBeenCalledTimes(1);
  });

  it('keeps the HTTP status when the error body cannot be parsed', async () => {
    const { log, self } = createClient();
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response('{not-json', {
        status: 502,
        headers: { 'content-type': 'application/json' },
      })
    );

    await expect(self.asScoped(createRequest()).fetch('/api/status')).rejects.toThrow(
      'Kibana self HTTP call failed: GET https://kibana.example.com → 502: invalid JSON response body'
    );
    expect(log.error).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalledWith(
      'Kibana scoped self HTTP call failed',
      expect.objectContaining({
        http: { request: { method: 'GET' }, response: { status_code: 502 } },
        labels: expect.objectContaining({
          self_http_target_origin: 'https://kibana.example.com',
          self_http_status_class: '5xx',
        }),
      })
    );
  });

  it('builds a local URL from server info when publicBaseUrl is absent', async () => {
    const { self } = createClient({ publicBaseUrl: null });

    await self.asScoped(createRequest({ basePath: '' })).fetch('/api/status');

    const request = (global.fetch as jest.Mock).mock.calls[0][0] as Request;
    expect(request.url).toBe('http://localhost:5601/api/status');
  });

  it('builds a local URL when configured to ignore publicBaseUrl', async () => {
    const { self } = createClient({ target: 'local' });

    await self.asScoped(createRequest()).fetch('/api/status');

    const request = (global.fetch as jest.Mock).mock.calls[0][0] as Request;
    expect(request.url).toBe('http://localhost:5601/base/s/my-space/api/status');
  });

  it('rejects full URLs and caller-provided protected headers', async () => {
    const { self } = createClient();
    const scoped = self.asScoped(createRequest());

    await expect(scoped.fetch('https://attacker.example/api/status')).rejects.toThrow(
      'Invalid self HTTP path'
    );
    await expect(scoped.fetch('/\\attacker.example/api/status')).rejects.toThrow(
      'Invalid self HTTP path'
    );
    await expect(
      scoped.fetch('/api/status', { headers: { authorization: 'Bearer attacker' } })
    ).rejects.toThrow('protected headers are not allowed');
    await expect(
      scoped.fetch('/api/status', {
        headers: { 'x-kbn-uiam-internal-caller-attestation': 'forged' },
      })
    ).rejects.toThrow('protected headers are not allowed');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('sets the internal origin header only when explicitly requested', async () => {
    const { self } = createClient({
      authHeaders: {
        authorization: 'test-auth-token',
        'x-elastic-internal-origin': 'untrusted-origin',
      },
    });
    const scoped = self.asScoped(createRequest());

    await scoped.fetch('/api/status');
    let request = (global.fetch as jest.Mock).mock.calls[0][0] as Request;
    expect(request.headers.has(X_ELASTIC_INTERNAL_ORIGIN_REQUEST)).toBe(false);

    await scoped.fetch('/internal/search', { access: 'internal' });
    request = (global.fetch as jest.Mock).mock.calls[1][0] as Request;
    expect(request.headers.get(X_ELASTIC_INTERNAL_ORIGIN_REQUEST)).toBe('Kibana');
  });

  it('rejects a second self-call hop before making a request', async () => {
    const { self } = createClient();

    await expect(
      self.asScoped(createFakeRequest({ 'x-kbn-self-call': 'true' })).fetch('/api/status')
    ).rejects.toThrow(SELF_CALL_RECURSION_ERROR);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('allows optional client authentication and public calls through a required-client-auth proxy', async () => {
    const optionalClientAuth = createClient({
      publicBaseUrl: null,
      getHttpConfig: jest.fn().mockReturnValue({
        ssl: { enabled: true, requestCert: true, rejectUnauthorized: false },
        selfHttp: { ssl: { verificationMode: 'full' } },
      } as HttpConfig),
      serverProtocol: 'https',
    });

    await optionalClientAuth.self.asScoped(createFakeRequest()).fetch('/api/status');
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toHaveProperty(
      'url',
      'https://localhost:5601/base/api/status'
    );

    const requiredClientAuth = createClient({
      getHttpConfig: jest.fn().mockReturnValue({
        ssl: { enabled: true, requestCert: true, rejectUnauthorized: true },
        selfHttp: { ssl: { verificationMode: 'full' } },
      } as HttpConfig),
    });

    await requiredClientAuth.self.asScoped(createFakeRequest()).fetch('/api/status');
    expect((global.fetch as jest.Mock).mock.calls[1][0]).toHaveProperty(
      'url',
      'https://kibana.example.com/base/api/status'
    );
  });

  it('rejects local self calls when client authentication becomes required after reload', async () => {
    let clientAuthenticationRequired = false;
    const getHttpConfig = jest.fn(
      () =>
        ({
          ssl: {
            enabled: clientAuthenticationRequired,
            requestCert: clientAuthenticationRequired,
            rejectUnauthorized: clientAuthenticationRequired,
          },
          selfHttp: { ssl: { verificationMode: 'full' } },
        } as HttpConfig)
    );
    const { self } = createClient({ publicBaseUrl: null, getHttpConfig });
    const scoped = self.asScoped(createFakeRequest());

    await scoped.fetch('/api/status');
    clientAuthenticationRequired = true;

    await expect(scoped.fetch('/api/status')).rejects.toThrow(SELF_CALL_MTLS_ERROR);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('denies redirects', async () => {
    const { self } = createClient();

    await self.asScoped(createFakeRequest()).fetch('/api/status');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({ redirect: 'manual' })
    );
  });

  it('errors on a 3xx response when maxRedirects is 0', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(null, { status: 302, headers: { location: '/api/next' } })
    );
    const { log, self } = createClient();

    await expect(self.asScoped(createFakeRequest()).fetch('/api/status')).rejects.toThrow(
      'server.selfHttp.maxRedirects is 0'
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(log.error).toHaveBeenCalledWith(
      'Kibana scoped self HTTP call failed',
      expect.objectContaining({
        http: { request: { method: 'GET' }, response: { status_code: 302 } },
      })
    );
  });

  it('follows a same-origin redirect when maxRedirects allows it', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        new Response(null, { status: 302, headers: { location: '/api/next' } })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );
    const { self } = createClient({
      getHttpConfig: jest.fn().mockReturnValue({
        ssl: { enabled: false, requestCert: false },
        selfHttp: { maxRedirects: 1, ssl: { verificationMode: 'full' } },
      } as HttpConfig),
    });

    await expect(self.asScoped(createFakeRequest()).fetch('/api/status')).resolves.toEqual({
      ok: true,
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    const secondRequest = (global.fetch as jest.Mock).mock.calls[1][0] as Request;
    expect(secondRequest.method).toBe('GET');
    expect(new URL(secondRequest.url).pathname).toBe('/api/next');
  });

  it('errors on a malformed redirect Location and discards the response body', async () => {
    const response = new Response('stranded body', {
      status: 302,
      headers: { location: 'http://[' },
    });
    const cancel = jest.spyOn(response.body!, 'cancel');
    (global.fetch as jest.Mock).mockResolvedValueOnce(response);
    const { self } = createClient({
      getHttpConfig: jest.fn().mockReturnValue({
        ssl: { enabled: false, requestCert: false },
        selfHttp: { maxRedirects: 1, ssl: { verificationMode: 'full' } },
      } as HttpConfig),
    });

    await expect(self.asScoped(createFakeRequest()).fetch('/api/status')).rejects.toMatchObject({
      name: 'HttpSelfFetchError',
      message: expect.stringContaining('invalid Location header'),
      response,
    });
    expect(cancel).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('refuses a cross-origin redirect even when maxRedirects allows hops', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: 'https://evil.example/steal' },
      })
    );
    const { self } = createClient({
      getHttpConfig: jest.fn().mockReturnValue({
        ssl: { enabled: false, requestCert: false },
        selfHttp: { maxRedirects: 5, ssl: { verificationMode: 'full' } },
      } as HttpConfig),
    });

    await expect(self.asScoped(createFakeRequest()).fetch('/api/status')).rejects.toThrow(
      'cross-origin redirect'
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('converts POST plus 302 into a GET follow-up without a body', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        new Response(null, { status: 302, headers: { location: '/api/next' } })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );
    const { self } = createClient({
      getHttpConfig: jest.fn().mockReturnValue({
        ssl: { enabled: false, requestCert: false },
        selfHttp: { maxRedirects: 1, ssl: { verificationMode: 'full' } },
      } as HttpConfig),
    });

    await self.asScoped(createFakeRequest()).fetch('/api/status', {
      method: 'POST',
      body: { hello: 'world' },
    });

    const secondRequest = (global.fetch as jest.Mock).mock.calls[1][0] as Request;
    expect(secondRequest.method).toBe('GET');
    expect(secondRequest.headers.get('content-type')).toBeNull();
  });

  it('returns the last-hop request when asResponse follows a redirect', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        new Response(null, { status: 302, headers: { location: '/api/next' } })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );
    const { self } = createClient({
      getHttpConfig: jest.fn().mockReturnValue({
        ssl: { enabled: false, requestCert: false },
        selfHttp: { maxRedirects: 1, ssl: { verificationMode: 'full' } },
      } as HttpConfig),
    });

    const result = await self.asScoped(createFakeRequest()).fetch('/api/status', {
      method: 'POST',
      body: { hello: 'world' },
      asResponse: true,
    });

    expect(result.request.method).toBe('GET');
    expect(new URL(result.request.url).pathname).toBe('/api/next');
    expect(result.body).toEqual({ ok: true });
  });

  it('preserves PUT on a 302 follow-up', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        new Response(null, { status: 302, headers: { location: '/api/next' } })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );
    const { self } = createClient({
      getHttpConfig: jest.fn().mockReturnValue({
        ssl: { enabled: false, requestCert: false },
        selfHttp: { maxRedirects: 1, ssl: { verificationMode: 'full' } },
      } as HttpConfig),
    });

    await self.asScoped(createFakeRequest()).fetch('/api/status', {
      method: 'PUT',
      body: { hello: 'world' },
    });

    const secondRequest = (global.fetch as jest.Mock).mock.calls[1][0] as Request;
    expect(secondRequest.method).toBe('PUT');
  });

  it('uses and reloads verified custom TLS trust for local and public HTTPS targets', async () => {
    let localCertificate = 'local server certificate';
    const localConfig = jest.fn(
      () =>
        ({
          ssl: { enabled: true, requestCert: false, certificate: localCertificate },
          selfHttp: { ssl: { verificationMode: 'full' } },
        } as HttpConfig)
    );
    const local = createClient({
      publicBaseUrl: null,
      getHttpConfig: localConfig,
      serverProtocol: 'https',
    });

    const localScoped = local.self.asScoped(createFakeRequest());
    await localScoped.fetch('/api/status');
    const firstLocalDispatcher = (global.fetch as jest.Mock).mock.calls[0][1].dispatcher;
    expect(firstLocalDispatcher).toBeDefined();

    localCertificate = 'reloaded local server certificate';
    await localScoped.fetch('/api/status');
    expect((global.fetch as jest.Mock).mock.calls[1][1].dispatcher).not.toBe(firstLocalDispatcher);
    await local.self.close();

    const publicConfig = jest.fn().mockReturnValue({
      ssl: { enabled: true, requestCert: false },
      selfHttp: { ssl: { verificationMode: 'full', certificateAuthorities: ['public CA'] } },
    } as HttpConfig);
    const publicTarget = createClient({ getHttpConfig: publicConfig });

    await publicTarget.self.asScoped(createFakeRequest()).fetch('/api/status');
    expect((global.fetch as jest.Mock).mock.calls[2][1].dispatcher).toBeDefined();
    await publicTarget.self.close();
  });

  it('returns response details when asResponse is true', async () => {
    const { self } = createClient();

    const result = await self.asScoped(createRequest()).fetch('/api/status', { asResponse: true });

    expect(result.body).toEqual({ ok: true });
    expect(result.response).toBeInstanceOf(Response);
    expect(result.request).toBeInstanceOf(Request);
  });

  it('uses the authorization header from a fake request instead of auth header storage', async () => {
    const authRequestHeaders = new AuthHeadersStorage();
    const request = createFakeRequest({
      authorization: 'ApiKey fake-request-api-key',
      cookie: 'sid=must-not-forward',
      'x-elastic-internal-origin': 'must-not-forward',
    });
    authRequestHeaders.set(request, { authorization: 'Bearer auth-storage-token' });
    const { self } = createClient({ authRequestHeaders });

    await self.asScoped(request).fetch('/api/status');

    const outboundRequest = (global.fetch as jest.Mock).mock.calls[0][0] as Request;
    expect(outboundRequest.headers.get('authorization')).toBe('ApiKey fake-request-api-key');
    expect(outboundRequest.headers.get('cookie')).toBeNull();
    expect(outboundRequest.headers.get('x-elastic-internal-origin')).toBeNull();
  });

  it('does not add authorization for a fake request without it', async () => {
    const authRequestHeaders = new AuthHeadersStorage();
    const request = createFakeRequest({});
    authRequestHeaders.set(request, { authorization: 'Bearer auth-storage-token' });
    const { self } = createClient({ authRequestHeaders });

    await self.asScoped(request).fetch('/api/status', { forwardRequestHeaders: true });

    const outboundRequest = (global.fetch as jest.Mock).mock.calls[0][0] as Request;
    expect(outboundRequest.headers.has('authorization')).toBe(false);
  });

  it('preserves UIAM authorization from a fake request unchanged', async () => {
    const authRequestHeaders = new AuthHeadersStorage();
    const request = createFakeRequest({ authorization: 'ApiKey essu_credential_123' });
    authRequestHeaders.set(request, { authorization: 'Bearer auth-storage-token' });
    const { self } = createClient({ authRequestHeaders });

    await self.asScoped(request).fetch('/api/status');

    const outboundRequest = (global.fetch as jest.Mock).mock.calls[0][0] as Request;
    expect(outboundRequest.headers.get('authorization')).toBe('ApiKey essu_credential_123');
  });

  it('prepends the server base path for a fake request, which carries no base path', async () => {
    const { self } = createClient();

    await self.asScoped(createFakeRequest()).fetch('/api/status');

    const outboundRequest = (global.fetch as jest.Mock).mock.calls[0][0] as Request;
    expect(outboundRequest.url).toBe('https://kibana.example.com/base/api/status');
  });

  it('prepends the space prefix for a fake request scoped to a non-default space', async () => {
    const { self } = createClient();

    await self.asScoped(createFakeRequest({}, 'marketing')).fetch('/api/status');

    const outboundRequest = (global.fetch as jest.Mock).mock.calls[0][0] as Request;
    expect(outboundRequest.url).toBe('https://kibana.example.com/base/s/marketing/api/status');
  });

  it('honours prependBasePath: false for a fake request', async () => {
    const { self } = createClient();

    await self
      .asScoped(createFakeRequest({}, 'marketing'))
      .fetch('/base/api/status', { prependBasePath: false });

    const outboundRequest = (global.fetch as jest.Mock).mock.calls[0][0] as Request;
    expect(outboundRequest.url).toBe('https://kibana.example.com/base/api/status');
  });

  it('forwards safe request headers without forwarding cookies', async () => {
    const { self } = createClient({
      authHeaders: { authorization: 'test-auth-token', cookie: 'sid=normalized' },
    });
    const request = createFakeRequest({
      accept: 'application/json',
      authorization: 'test-token-placeholder',
      cookie: 'sid=attacker',
      host: 'attacker.example',
      origin: 'https://origin.example',
      referer: 'https://origin.example/app/home',
      'sec-fetch-site': 'same-origin',
      'x-elastic-internal-origin': 'attacker',
      'x-elastic-product-origin': 'observability',
      'x-kbn-context': '%7B%7D',
    });

    await self.asScoped(request).fetch('/api/status', { forwardRequestHeaders: true });

    const outboundRequest = (global.fetch as jest.Mock).mock.calls[0][0] as Request;
    expect(outboundRequest.headers.get('accept')).toBe('application/json');
    expect(outboundRequest.headers.get('origin')).toBe('https://origin.example');
    expect(outboundRequest.headers.get('referer')).toBe('https://origin.example/app/home');
    expect(outboundRequest.headers.get('sec-fetch-site')).toBeNull();
    expect(outboundRequest.headers.get('x-elastic-product-origin')).toBe('observability');
    expect(outboundRequest.headers.get('x-kbn-context')).toBe('%7B%7D');
    expect(outboundRequest.headers.get('authorization')).toBe('test-token-placeholder');
    expect(outboundRequest.headers.get('cookie')).toBeNull();
    expect(outboundRequest.headers.get('host')).toBeNull();
    expect(outboundRequest.headers.get('x-elastic-internal-origin')).toBeNull();
    expect(outboundRequest.headers.get('user-agent')).toBe('KibanaSelfHttpClient/9.9.9');
  });

  describe('UIAM attestation getter', () => {
    it('sets the attestation header from the string the getter returns', async () => {
      const getter = jest.fn().mockReturnValue('sig-123');
      const { self } = createClient({ getUiamAttestationGetter: () => getter });
      const request = createRequest();

      await self.asScoped(request).fetch('/api/status');

      const outboundRequest = (global.fetch as jest.Mock).mock.calls[0][0] as Request;
      expect(outboundRequest.headers.get('x-kbn-uiam-internal-caller-attestation')).toBe('sig-123');
      expect(outboundRequest.headers.get('x-kbn-self-call')).toBe('true');
      expect(getter).toHaveBeenCalledWith(request, 'test-auth-token');
    });

    it('leaves headers unchanged when the getter returns nothing', async () => {
      const getter = jest.fn().mockReturnValue(undefined);
      const { self } = createClient({ getUiamAttestationGetter: () => getter });

      await self.asScoped(createRequest()).fetch('/api/status');

      expect(getter).toHaveBeenCalledTimes(1);
      const outboundRequest = (global.fetch as jest.Mock).mock.calls[0][0] as Request;
      expect(outboundRequest.headers.get('x-kbn-uiam-internal-caller-attestation')).toBeNull();
      expect(outboundRequest.headers.get('x-kbn-self-call')).toBe('true');
      expect(outboundRequest.headers.get('authorization')).toBe('test-auth-token');
    });

    it('does not set the attestation header when no getter is available', async () => {
      const getUiamAttestationGetter = jest.fn().mockReturnValue(undefined);
      const withGetter = createClient({ getUiamAttestationGetter });
      await withGetter.self.asScoped(createRequest()).fetch('/api/status');
      expect(getUiamAttestationGetter).toHaveBeenCalledTimes(1);
      const requestWithGetter = (global.fetch as jest.Mock).mock.calls[0][0] as Request;
      expect(requestWithGetter.headers.get('x-kbn-uiam-internal-caller-attestation')).toBeNull();

      const withoutGetter = createClient();
      await withoutGetter.self.asScoped(createRequest()).fetch('/api/status');
      const requestWithoutGetter = (global.fetch as jest.Mock).mock.calls[1][0] as Request;
      expect(requestWithoutGetter.headers.get('x-kbn-uiam-internal-caller-attestation')).toBeNull();
    });
  });
});
