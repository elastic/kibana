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
import { createInternalHttpSelfClient } from './self_client';

const originalFetch = global.fetch;

const createRequest = (overrides: Partial<KibanaRequest> = {}): KibanaRequest =>
  ({
    basePath: '/base/s/my-space',
    events: {
      aborted$: NEVER,
      completed$: NEVER,
    },
    headers: {},
    url: new URL('https://source.example/base/s/my-space/app/home'),
    ...overrides,
  } as KibanaRequest);

const createClient = ({
  publicBaseUrl = 'https://kibana.example.com/base',
  authHeaders = { authorization: 'Bearer scoped' },
  target = 'auto',
}: {
  publicBaseUrl?: string | null;
  authHeaders?: Record<string, string>;
  target?: 'auto' | 'local';
} = {}) => {
  const authRequestHeaders = {
    get: jest.fn().mockReturnValue(authHeaders),
    set: jest.fn(),
  } as jest.Mocked<IAuthHeadersStorage>;

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
      protocol: 'http',
    }),
    kibanaVersion: '9.9.9',
    target,
  });

  return { authRequestHeaders, self };
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
    expect(request.headers.get('authorization')).toBe('Bearer scoped');
    expect(request.headers.get('kbn-version')).toBe('9.9.9');
    expect(request.headers.get('x-kbn-self-call')).toBe('true');
    expect(request.headers.get('x-kbn-self-call-depth')).toBe('1');
    expect(request.headers.get('user-agent')).toBe('KibanaSelfHttpClient/9.9.9');
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 60_000);
    setTimeoutSpy.mockRestore();
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

  it('sets the internal origin header only when explicitly requested', async () => {
    const { self } = createClient();
    const scoped = self.asScoped(createRequest());

    await scoped.fetch('/api/status');
    let request = (global.fetch as jest.Mock).mock.calls[0][0] as Request;
    expect(request.headers.has(X_ELASTIC_INTERNAL_ORIGIN_REQUEST)).toBe(false);

    await scoped.fetch('/internal/search', { access: 'internal' });
    request = (global.fetch as jest.Mock).mock.calls[1][0] as Request;
    expect(request.headers.get(X_ELASTIC_INTERNAL_ORIGIN_REQUEST)).toBe('Kibana');
  });

  it('rejects calls after the bounded self-call depth is reached', async () => {
    const { self } = createClient();

    await expect(
      self
        .asScoped(createRequest({ headers: { 'x-kbn-self-call-depth': '4' } }))
        .fetch('/api/status')
    ).rejects.toThrow('maximum depth 4 was reached');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('sets a non-negative outgoing self-call depth header', async () => {
    const { self } = createClient();

    await self
      .asScoped(createRequest({ headers: { 'x-kbn-self-call-depth': '-1000' } }))
      .fetch('/api/status');
    await self
      .asScoped(createRequest({ headers: { 'x-kbn-self-call-depth': '1.9' } }))
      .fetch('/api/status');

    const negativeDepthRequest = (global.fetch as jest.Mock).mock.calls[0][0] as Request;
    const fractionalDepthRequest = (global.fetch as jest.Mock).mock.calls[1][0] as Request;
    expect(negativeDepthRequest.headers.get('x-kbn-self-call-depth')).toBe('1');
    expect(fractionalDepthRequest.headers.get('x-kbn-self-call-depth')).toBe('2');
  });

  it('returns response details when asResponse is true', async () => {
    const { self } = createClient();

    const result = await self.asScoped(createRequest()).fetch('/api/status', { asResponse: true });

    expect(result.body).toEqual({ ok: true });
    expect(result.response).toBeInstanceOf(Response);
    expect(result.request).toBeInstanceOf(Request);
  });

  it('forwards safe request headers when forwardRequestHeaders is enabled', async () => {
    const { self } = createClient();
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
    expect(outboundRequest.headers.get('authorization')).toBe('Bearer scoped');
    expect(outboundRequest.headers.get('cookie')).toBeNull();
    expect(outboundRequest.headers.get('host')).toBeNull();
    expect(outboundRequest.headers.get('x-elastic-internal-origin')).toBeNull();
    expect(outboundRequest.headers.get('user-agent')).toBe('KibanaSelfHttpClient/9.9.9');
  });
});
