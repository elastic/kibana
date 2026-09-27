/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { NEVER } from 'rxjs';
import type {
  HttpSelfUnauthorizedErrorHandler,
  IAuthHeadersStorage,
  KibanaRequest,
} from '@kbn/core-http-server';
import { UIAM_INTERNAL_CALLER_ATTESTATION_HEADER } from '@kbn/core-security-server';
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
import { SELF_CALL_AUTH_CHALLENGE_HEADER } from './self_client_observer';

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
  unauthorizedErrorHandler,
}: {
  publicBaseUrl?: string | null;
  authHeaders?: Record<string, string>;
  authRequestHeaders?: IAuthHeadersStorage;
  target?: 'auto' | 'local';
  getHttpConfig?: jest.MockedFunction<() => HttpConfig>;
  serverProtocol?: 'http' | 'https';
  getUiamAttestationGetter?: () => SelfClientUiamAttestationGetter | undefined;
  unauthorizedErrorHandler?: HttpSelfUnauthorizedErrorHandler;
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
    getUnauthorizedErrorHandler: () => unauthorizedErrorHandler,
  });

  return { authRequestHeaders, getHttpConfig, log, self };
};

const okResponse = () =>
  new Response(JSON.stringify({ ok: true }), {
    headers: { 'content-type': 'application/json' },
  });

const unauthorizedResponse = ({ marked = true }: { marked?: boolean } = {}) =>
  new Response(JSON.stringify({ message: 'Unauthorized' }), {
    status: 401,
    statusText: 'Unauthorized',
    headers: {
      'content-type': 'application/json',
      ...(marked ? { [SELF_CALL_AUTH_CHALLENGE_HEADER]: 'true' } : {}),
    },
  });

const mockFetchResponses = (...responses: Response[]) => {
  const fetchMock = global.fetch as jest.Mock;
  fetchMock.mockReset();
  responses.forEach((response) => fetchMock.mockResolvedValueOnce(response));
  fetchMock.mockResolvedValue(okResponse());
};

/** The `Request` handed to `fetch` on the nth attempt (0 = first attempt). */
const sentRequest = (attempt = 0) => (global.fetch as jest.Mock).mock.calls[attempt][0] as Request;

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

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
        self_http_retry: 'false',
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
        self_http_retry: 'false',
      },
    });
    const serializedLog = JSON.stringify((log.debug as jest.Mock).mock.calls);
    expect(serializedLog).not.toContain('private-target');
    expect(serializedLog).not.toContain('fake-request');
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

  it('rejects self calls when server mTLS is optional or required, including after reload', async () => {
    let requestCert = false;
    const getHttpConfig = jest.fn(
      () =>
        ({
          ssl: { enabled: requestCert, requestCert },
          selfHttp: { ssl: { verificationMode: 'full' } },
        } as HttpConfig)
    );
    const { self } = createClient({ getHttpConfig });
    const scoped = self.asScoped(createFakeRequest());

    await scoped.fetch('/api/status');
    requestCert = true;

    await expect(scoped.fetch('/api/status')).rejects.toThrow(SELF_CALL_MTLS_ERROR);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('denies redirects', async () => {
    const { self } = createClient();

    await self.asScoped(createFakeRequest()).fetch('/api/status');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({ redirect: 'error' })
    );
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

  describe('401 retry', () => {
    const retryHandler = (authHeaders: Record<string, string>): HttpSelfUnauthorizedErrorHandler =>
      jest.fn(async (options, toolkit) => toolkit.retry({ authHeaders }));

    // Stands in for the Security-provided getter, binding the attestation to whichever credential
    // the client is about to send so a retry can be told apart from the first attempt.
    const attestationGetter = (_request: KibanaRequest, outboundAuthorization: string | null) =>
      outboundAuthorization
        ? `attestation-for-${outboundAuthorization.replace('Bearer ', '')}`
        : undefined;

    it('replays the call once with the refreshed credential', async () => {
      mockFetchResponses(unauthorizedResponse(), okResponse());
      const handler = retryHandler({ authorization: 'Bearer essu_refreshed' });
      const { self } = createClient({ unauthorizedErrorHandler: handler });

      const result = await self
        .asScoped(createFakeRequest({ authorization: 'Bearer essu_expired' }))
        .fetch('/api/status');

      expect(result).toEqual({ ok: true });
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(sentRequest(0).headers.get('authorization')).toBe('Bearer essu_expired');
      expect(sentRequest(1).headers.get('authorization')).toBe('Bearer essu_refreshed');
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/api/status', responseHeaders: expect.any(Headers) }),
        expect.anything()
      );
    });

    it('re-derives the attestation for the refreshed credential', async () => {
      mockFetchResponses(unauthorizedResponse(), okResponse());
      const { self } = createClient({
        unauthorizedErrorHandler: retryHandler({ authorization: 'Bearer essu_refreshed' }),
        getUiamAttestationGetter: () => attestationGetter,
      });

      await self
        .asScoped(createFakeRequest({ authorization: 'Bearer essu_expired' }))
        .fetch('/api/status');

      expect(sentRequest(0).headers.get(UIAM_INTERNAL_CALLER_ATTESTATION_HEADER)).toBe(
        'attestation-for-essu_expired'
      );
      expect(sentRequest(1).headers.get(UIAM_INTERNAL_CALLER_ATTESTATION_HEADER)).toBe(
        'attestation-for-essu_refreshed'
      );
    });

    it('ignores an attestation the handler tried to supply, and stamps its own', async () => {
      mockFetchResponses(unauthorizedResponse(), okResponse());
      const { log, self } = createClient({
        getUiamAttestationGetter: () => attestationGetter,
        unauthorizedErrorHandler: jest.fn(async (options, toolkit) =>
          toolkit.retry({
            authHeaders: {
              authorization: 'Bearer essu_refreshed',
              [UIAM_INTERNAL_CALLER_ATTESTATION_HEADER]: 'handler-invented',
            },
          })
        ),
      });

      await self
        .asScoped(createFakeRequest({ authorization: 'Bearer essu_expired' }))
        .fetch('/api/status');

      // Core derives the attestation from the credential it is about to send, so a handler that
      // names one is ignored rather than trusted.
      expect(sentRequest(1).headers.get(UIAM_INTERNAL_CALLER_ATTESTATION_HEADER)).toBe(
        'attestation-for-essu_refreshed'
      );
      expect(log.warn).toHaveBeenCalledWith(
        expect.stringContaining(UIAM_INTERNAL_CALLER_ATTESTATION_HEADER)
      );
    });

    it('preserves the method, URL, and body on the replayed call', async () => {
      mockFetchResponses(unauthorizedResponse(), okResponse());
      const { self } = createClient({
        unauthorizedErrorHandler: retryHandler({ authorization: 'Bearer essu_refreshed' }),
      });

      await self
        .asScoped(createFakeRequest({ authorization: 'Bearer essu_expired' }))
        .fetch('/api/thing', { method: 'POST', body: { name: 'value' } });

      const [first, second] = [sentRequest(0), sentRequest(1)];
      expect(second.method).toBe(first.method);
      expect(second.url).toBe(first.url);
      expect(await second.text()).toBe(JSON.stringify({ name: 'value' }));
      expect(second.headers.get('x-kbn-self-call')).toBe('true');
      expect(second.headers.get('kbn-version')).toBe('9.9.9');
    });

    it('does not replay a 401 that the authentication lifecycle did not raise', async () => {
      // A route handler can return 401 after performing a side effect (Core forwards an
      // Elasticsearch 401 thrown by a handler), so an unmarked 401 must never be replayed.
      mockFetchResponses(unauthorizedResponse({ marked: false }), okResponse());
      const handler = retryHandler({ authorization: 'Bearer essu_refreshed' });
      const { self } = createClient({ unauthorizedErrorHandler: handler });

      await expect(
        self
          .asScoped(createFakeRequest({ authorization: 'Bearer essu_expired' }))
          .fetch('/api/thing', {
            method: 'POST',
            body: { name: 'value' },
          })
      ).rejects.toThrow();

      expect(handler).not.toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('does not consult the handler for a non-401 response', async () => {
      mockFetchResponses(new Response('nope', { status: 403 }));
      const handler = retryHandler({ authorization: 'Bearer essu_refreshed' });
      const { self } = createClient({ unauthorizedErrorHandler: handler });

      await expect(
        self
          .asScoped(createFakeRequest({ authorization: 'Bearer essu_expired' }))
          .fetch('/api/status')
      ).rejects.toThrow();

      expect(handler).not.toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('surfaces the original 401 when the handler does not handle it', async () => {
      mockFetchResponses(unauthorizedResponse());
      const { self } = createClient({
        unauthorizedErrorHandler: jest.fn(async (options, toolkit) => toolkit.notHandled()),
      });

      await expect(
        self
          .asScoped(createFakeRequest({ authorization: 'Bearer essu_expired' }))
          .fetch('/api/status')
      ).rejects.toThrow('Unauthorized');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('does not replay when the handler returns the credential that was just sent', async () => {
      mockFetchResponses(unauthorizedResponse());
      const { self } = createClient({
        unauthorizedErrorHandler: retryHandler({ authorization: 'Bearer essu_expired' }),
      });

      await expect(
        self
          .asScoped(createFakeRequest({ authorization: 'Bearer essu_expired' }))
          .fetch('/api/status')
      ).rejects.toThrow();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('warns and does not replay when the handler throws', async () => {
      mockFetchResponses(unauthorizedResponse());
      const { log, self } = createClient({
        unauthorizedErrorHandler: jest.fn(async () => {
          throw new Error('mint exploded');
        }),
      });

      await expect(
        self
          .asScoped(createFakeRequest({ authorization: 'Bearer essu_expired' }))
          .fetch('/api/status')
      ).rejects.toThrow();
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('mint exploded'));
    });

    it('behaves exactly as before when no handler is registered', async () => {
      mockFetchResponses(unauthorizedResponse());
      const { self } = createClient();

      await expect(
        self
          .asScoped(createFakeRequest({ authorization: 'Bearer essu_expired' }))
          .fetch('/api/status')
      ).rejects.toThrow();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('drops Core-owned headers from the overlay and warns', async () => {
      mockFetchResponses(unauthorizedResponse(), okResponse());
      const { log, self } = createClient({
        unauthorizedErrorHandler: retryHandler({
          authorization: 'Bearer essu_refreshed',
          'kbn-version': '0.0.0',
          host: 'evil.example',
          cookie: 'sid=1',
          'x-kbn-self-call': 'false',
          'x-elastic-internal-origin': 'Evil',
          'x-client-authentication': 'shared-secret',
          'es-secondary-x-client-authentication': 'shared-secret',
        }),
      });

      await self
        .asScoped(createFakeRequest({ authorization: 'Bearer essu_expired' }))
        .fetch('/api/status');

      const replay = sentRequest(1);
      expect(replay.headers.get('authorization')).toBe('Bearer essu_refreshed');
      expect(replay.headers.get('kbn-version')).toBe('9.9.9');
      expect(replay.headers.get('host')).not.toBe('evil.example');
      expect(replay.headers.get('cookie')).toBeNull();
      expect(replay.headers.get('x-kbn-self-call')).toBe('true');
      expect(replay.headers.get('x-elastic-internal-origin')).toBeNull();
      expect(replay.headers.get('x-client-authentication')).toBeNull();
      expect(replay.headers.get('es-secondary-x-client-authentication')).toBeNull();
      for (const name of [
        'kbn-version',
        'host',
        'cookie',
        'x-kbn-self-call',
        'x-elastic-internal-origin',
        'x-client-authentication',
        'es-secondary-x-client-authentication',
      ]) {
        expect(log.warn).toHaveBeenCalledWith(expect.stringContaining(`[${name}]`));
      }
    });

    it('cancels the discarded 401 body and returns the replayed raw response', async () => {
      const cancel = jest.fn().mockResolvedValue(undefined);
      const firstResponse = unauthorizedResponse();
      Object.defineProperty(firstResponse, 'body', { value: { cancel } });
      mockFetchResponses(firstResponse, okResponse());
      const { self } = createClient({
        unauthorizedErrorHandler: retryHandler({ authorization: 'Bearer essu_refreshed' }),
      });

      const { response } = await self
        .asScoped(createFakeRequest({ authorization: 'Bearer essu_expired' }))
        .fetch('/api/status', { asResponse: true, rawResponse: true });

      expect(cancel).toHaveBeenCalledTimes(1);
      expect(response.status).toBe(200);
    });

    it('logs the replay attempt separately from the first one', async () => {
      mockFetchResponses(unauthorizedResponse(), okResponse());
      const { log, self } = createClient({
        unauthorizedErrorHandler: retryHandler({ authorization: 'Bearer essu_refreshed' }),
      });

      await self
        .asScoped(createFakeRequest({ authorization: 'Bearer essu_expired' }))
        .fetch('/api/status');

      expect(log.debug).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ labels: expect.objectContaining({ self_http_retry: 'false' }) })
      );
      expect(log.debug).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ labels: expect.objectContaining({ self_http_retry: 'true' }) })
      );
    });

    describe('cancellation', () => {
      it('does not consult the handler when the call was already aborted', async () => {
        mockFetchResponses(unauthorizedResponse());
        const handler = retryHandler({ authorization: 'Bearer essu_refreshed' });
        const { self } = createClient({ unauthorizedErrorHandler: handler });
        const signal = AbortSignal.abort();

        await expect(
          self
            .asScoped(createFakeRequest({ authorization: 'Bearer essu_expired' }))
            .fetch('/api/status', { signal })
        ).rejects.toThrow();

        expect(handler).not.toHaveBeenCalled();
      });

      it('stops waiting on the refresh when the caller aborts', async () => {
        const cancel = jest.fn().mockResolvedValue(undefined);
        const firstResponse = unauthorizedResponse();
        Object.defineProperty(firstResponse, 'body', { value: { cancel } });
        mockFetchResponses(firstResponse, okResponse());
        const neverSettles = new Promise<never>(() => {});
        const { self } = createClient({
          unauthorizedErrorHandler: jest.fn(() => neverSettles),
        });
        const controller = new AbortController();

        const pending = self
          .asScoped(createFakeRequest({ authorization: 'Bearer essu_expired' }))
          .fetch('/api/status', { signal: controller.signal });
        await flushPromises();
        controller.abort();

        await expect(pending).rejects.toThrow();
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it('stops waiting on the refresh when the call times out', async () => {
        jest.useFakeTimers();
        try {
          mockFetchResponses(unauthorizedResponse(), okResponse());
          const { self } = createClient({
            unauthorizedErrorHandler: jest.fn(() => new Promise<never>(() => {})),
          });
          const startedAt = Date.now();

          const pending = self
            .asScoped(createFakeRequest({ authorization: 'Bearer essu_expired' }))
            .fetch('/api/status', { timeout: 1_000 });
          const assertion = expect(pending).rejects.toThrow();

          await jest.advanceTimersByTimeAsync(1_000);
          await assertion;
          // The whole call, both attempts included, stayed inside the caller's budget.
          expect(Date.now()).toBeLessThanOrEqual(1_000 + startedAt);
          expect(global.fetch).toHaveBeenCalledTimes(1);
        } finally {
          jest.useRealTimers();
        }
      });

      it('leaves a shared refresh running for the callers that did not abort', async () => {
        const responses = [unauthorizedResponse(), unauthorizedResponse(), okResponse()];
        mockFetchResponses(...responses);
        let releaseMint: (headers: Record<string, string>) => void = () => {};
        const mint = new Promise<Record<string, string>>((resolve) => {
          releaseMint = resolve;
        });
        const { self } = createClient({
          unauthorizedErrorHandler: jest.fn(async (options, toolkit) =>
            toolkit.retry({ authHeaders: await mint })
          ),
        });
        const request = createFakeRequest({ authorization: 'Bearer essu_expired' });
        const controller = new AbortController();

        const aborted = self.asScoped(request).fetch('/api/status', { signal: controller.signal });
        const survivor = self.asScoped(request).fetch('/api/status');
        await flushPromises();

        controller.abort();
        await expect(aborted).rejects.toThrow();

        releaseMint({ authorization: 'Bearer essu_refreshed' });
        await expect(survivor).resolves.toEqual({ ok: true });
        // Two first attempts plus exactly one replay: the aborted call never replayed.
        expect(global.fetch).toHaveBeenCalledTimes(3);
        expect(sentRequest(2).headers.get('authorization')).toBe('Bearer essu_refreshed');
      });

      it('ignores a handler that settles after the call was aborted', async () => {
        mockFetchResponses(unauthorizedResponse(), okResponse());
        let settle: (result: unknown) => void = () => {};
        const late = new Promise((resolve) => {
          settle = resolve;
        });
        const { self } = createClient({
          unauthorizedErrorHandler: jest.fn(async (options, toolkit) => {
            await late;
            return toolkit.retry({ authHeaders: { authorization: 'Bearer essu_refreshed' } });
          }),
        });
        const controller = new AbortController();

        const pending = self
          .asScoped(createFakeRequest({ authorization: 'Bearer essu_expired' }))
          .fetch('/api/status', { signal: controller.signal });
        await flushPromises();
        controller.abort();
        await expect(pending).rejects.toThrow();

        settle(undefined);
        await flushPromises();
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it('ignores a handler that rejects after the call was aborted', async () => {
        mockFetchResponses(unauthorizedResponse(), okResponse());
        let fail: (error: Error) => void = () => {};
        const late = new Promise<never>((_resolve, reject) => {
          fail = reject;
        });
        const { log, self } = createClient({ unauthorizedErrorHandler: jest.fn(() => late) });
        const controller = new AbortController();

        const pending = self
          .asScoped(createFakeRequest({ authorization: 'Bearer essu_expired' }))
          .fetch('/api/status', { signal: controller.signal });
        await flushPromises();
        controller.abort();
        await expect(pending).rejects.toThrow();

        fail(new Error('mint exploded'));
        await flushPromises();
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(log.warn).not.toHaveBeenCalledWith(expect.stringContaining('mint exploded'));
      });
    });
  });
});
