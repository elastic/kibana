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
import type { HttpConfig } from './http_config';
import {
  createInternalHttpSelfClient,
  SELF_CALL_MTLS_ERROR,
  SELF_CALL_RECURSION_ERROR,
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

const createClient = ({
  publicBaseUrl = 'https://kibana.example.com/base',
  authHeaders = { authorization: 'test-scoped-authorization' },
  target = 'auto',
  getHttpConfig = jest.fn().mockReturnValue({
    ssl: { enabled: false, requestCert: false },
    selfHttp: { ssl: {} },
  } as HttpConfig),
  serverProtocol = 'http',
}: {
  publicBaseUrl?: string | null;
  authHeaders?: Record<string, string>;
  target?: 'auto' | 'local';
  getHttpConfig?: jest.MockedFunction<() => HttpConfig>;
  serverProtocol?: 'http' | 'https';
} = {}) => {
  const authRequestHeaders = {
    get: jest.fn().mockReturnValue(authHeaders),
    set: jest.fn(),
  } as jest.Mocked<IAuthHeadersStorage>;
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
    expect(request.headers.get('authorization')).toBe('test-scoped-authorization');
    expect(request.headers.get('kbn-version')).toBe('9.9.9');
    expect(request.headers.get('x-kbn-self-call')).toBe('true');
    expect(request.headers.get(X_ELASTIC_INTERNAL_ORIGIN_REQUEST)).toBe('Kibana');
    expect(request.headers.get('user-agent')).toBe('KibanaSelfHttpClient/9.9.9');
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 60_000);
    setTimeoutSpy.mockRestore();
  });

  it('logs only the source route template and methods plus the target mode', async () => {
    const { log, self } = createClient();

    await self.asScoped(createRequest()).fetch('/api/private-target/private-target-id', {
      method: 'PATCH',
      query: { secret: 'private-query-value' },
      body: { secret: 'private-body-value' },
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
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('always sets the Core-owned internal origin header', async () => {
    const { self } = createClient();

    await self.asScoped(createRequest()).fetch('/api/status');

    const request = (global.fetch as jest.Mock).mock.calls[0][0] as Request;
    expect(request.headers.get(X_ELASTIC_INTERNAL_ORIGIN_REQUEST)).toBe('Kibana');
  });

  it('rejects a second self-call hop before making a request', async () => {
    const { self } = createClient();

    await expect(
      self.asScoped(createRequest({ headers: { 'x-kbn-self-call': 'true' } })).fetch('/api/status')
    ).rejects.toThrow(SELF_CALL_RECURSION_ERROR);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects self calls when server mTLS is optional or required, including after reload', async () => {
    let requestCert = false;
    const getHttpConfig = jest.fn(
      () =>
        ({
          ssl: { enabled: requestCert, requestCert },
          selfHttp: { ssl: {} },
        } as HttpConfig)
    );
    const { self } = createClient({ getHttpConfig });
    const scoped = self.asScoped(createRequest());

    await scoped.fetch('/api/status');
    requestCert = true;

    await expect(scoped.fetch('/api/status')).rejects.toThrow(SELF_CALL_MTLS_ERROR);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('denies redirects', async () => {
    const { self } = createClient();

    await self.asScoped(createRequest()).fetch('/api/status');

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
          selfHttp: { ssl: {} },
        } as HttpConfig)
    );
    const local = createClient({
      publicBaseUrl: null,
      getHttpConfig: localConfig,
      serverProtocol: 'https',
    });

    const localScoped = local.self.asScoped(createRequest({ basePath: '' }));
    await localScoped.fetch('/api/status');
    const firstLocalDispatcher = (global.fetch as jest.Mock).mock.calls[0][1].dispatcher;
    expect(firstLocalDispatcher).toBeDefined();

    localCertificate = 'reloaded local server certificate';
    await localScoped.fetch('/api/status');
    expect((global.fetch as jest.Mock).mock.calls[1][1].dispatcher).not.toBe(firstLocalDispatcher);
    await local.self.close();

    const publicConfig = jest.fn().mockReturnValue({
      ssl: { enabled: true, requestCert: false },
      selfHttp: { ssl: { certificateAuthorities: ['public CA'] } },
    } as HttpConfig);
    const publicTarget = createClient({ getHttpConfig: publicConfig });

    await publicTarget.self.asScoped(createRequest()).fetch('/api/status');
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

  it('forwards safe request headers without forwarding cookies', async () => {
    const { self } = createClient({
      authHeaders: { authorization: 'test-scoped-authorization', cookie: 'sid=normalized' },
    });
    const request = createRequest({
      headers: {
        accept: 'application/json',
        authorization: 'Bearer attacker',
        cookie: 'sid=attacker',
        host: 'attacker.example',
        origin: 'https://origin.example',
        referer: 'https://origin.example/app/home',
        'sec-fetch-site': 'same-origin',
        'x-elastic-internal-origin': 'attacker',
        'x-elastic-product-origin': 'observability',
        'x-kbn-context': '%7B%7D',
      },
    });

    await self.asScoped(request).fetch('/api/status', { forwardRequestHeaders: true });

    const outboundRequest = (global.fetch as jest.Mock).mock.calls[0][0] as Request;
    expect(outboundRequest.headers.get('accept')).toBe('application/json');
    expect(outboundRequest.headers.get('origin')).toBe('https://origin.example');
    expect(outboundRequest.headers.get('referer')).toBe('https://origin.example/app/home');
    expect(outboundRequest.headers.get('sec-fetch-site')).toBeNull();
    expect(outboundRequest.headers.get('x-elastic-product-origin')).toBe('observability');
    expect(outboundRequest.headers.get('x-kbn-context')).toBe('%7B%7D');
    expect(outboundRequest.headers.get('authorization')).toBe('test-scoped-authorization');
    expect(outboundRequest.headers.get('cookie')).toBeNull();
    expect(outboundRequest.headers.get('host')).toBeNull();
    expect(outboundRequest.headers.get('x-elastic-internal-origin')).toBe('Kibana');
    expect(outboundRequest.headers.get('user-agent')).toBe('KibanaSelfHttpClient/9.9.9');
  });
});
