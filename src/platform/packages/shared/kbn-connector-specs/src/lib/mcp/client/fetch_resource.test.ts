/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Agent, ProxyAgent, fetch as undiciFetch } from 'undici';
import { loggerMock } from '@kbn/logging-mocks';
import type { ConnectorNetworkSettings } from '../../clients/client_type_spec';
import { createFetchResource } from './fetch_resource';

const undiciFetchMock = undiciFetch as unknown as jest.Mock;

jest.mock('undici', () => {
  const MockAgent = jest.fn().mockImplementation(() => ({
    close: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn(),
  }));
  const MockProxyAgent = jest.fn().mockImplementation(() => ({
    close: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn(),
  }));
  return {
    Agent: MockAgent,
    ProxyAgent: MockProxyAgent,
    fetch: jest.fn(),
  };
});

describe('createFetchResource', () => {
  const logger = loggerMock.create();
  const targetUrl = 'https://mcp-server.example.com/v1/mcp';
  const allowedHosts = ['mcp-server.example.com', 'allowed.example.com'];

  let networkSettings: jest.Mocked<ConnectorNetworkSettings>;

  const createResource = (opts: {
    targetUrl: string;
    headers?: Record<string, string>;
    getAuthHeaders?: () => Promise<Record<string, string>>;
    userAgent?: string;
  }) =>
    createFetchResource({
      networkSettings,
      logger,
      getAuthHeaders: async () => ({}),
      ...opts,
    });

  const mockRedirectResponse = (status: number, location: string | null): Response => {
    const headers = new Headers();
    if (location !== null) {
      headers.set('location', location);
    }
    return new Response(null, { status, headers });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    networkSettings = {
      ensureUriAllowed: jest.fn((uri: string) => {
        const { hostname } = new URL(uri);
        if (!allowedHosts.includes(hostname)) {
          throw new Error(
            `target url "${uri}" is not added to the Kibana config xpack.actions.allowedHosts`
          );
        }
      }),
      ensureHostnameAllowed: jest.fn(),
      getSslSettings: jest.fn().mockReturnValue({}),
      getProxySettings: jest.fn().mockReturnValue(undefined),
      getCustomHostSettings: jest.fn().mockReturnValue(undefined),
      getResponseSettings: jest.fn().mockReturnValue({
        maxContentLength: 1_000_000,
        timeout: 60_000,
      }),
    };
  });

  describe('initial URL validation', () => {
    it('throws immediately if the target URL is not allowed', () => {
      expect(() =>
        createResource({ targetUrl: 'https://evil.internal.example.com/steal' })
      ).toThrow(
        'target url "https://evil.internal.example.com/steal" is not added to the Kibana config xpack.actions.allowedHosts'
      );
      expect(undiciFetchMock).not.toHaveBeenCalled();
    });

    it('does not throw for an allowed target URL', () => {
      expect(() => createResource({ targetUrl })).not.toThrow();
    });

    it('validates every directly requested URL, not only the resource target', async () => {
      const resource = createResource({ targetUrl });

      await expect(resource.fetch('https://evil.internal.example.com/steal')).rejects.toThrow(
        'target url "https://evil.internal.example.com/steal" is not added to the Kibana config xpack.actions.allowedHosts'
      );
      expect(undiciFetchMock).not.toHaveBeenCalled();
    });
  });

  describe('redirect URL validation', () => {
    it('validates each redirect URL against the allowlist', async () => {
      const resource = createResource({ targetUrl });

      const redirectUrl = 'https://allowed.example.com/v1/mcp';
      const finalResponse = new Response('final', { status: 200 });
      undiciFetchMock
        .mockResolvedValueOnce(mockRedirectResponse(302, redirectUrl))
        .mockResolvedValueOnce(finalResponse);

      await resource.fetch(targetUrl, { method: 'POST' });

      expect(networkSettings.ensureUriAllowed).toHaveBeenCalledWith(redirectUrl);
    });

    it('throws when a redirect URL is not on the allowlist', async () => {
      const resource = createResource({ targetUrl });

      undiciFetchMock.mockResolvedValueOnce(
        mockRedirectResponse(302, 'https://evil.internal.example.com/steal')
      );

      await expect(resource.fetch(targetUrl, { method: 'POST' })).rejects.toThrow(
        'target url "https://evil.internal.example.com/steal" is not added to the Kibana config xpack.actions.allowedHosts'
      );
    });
  });

  describe('dispatcher caching', () => {
    it('reuses dispatchers within a request class and separates finite from persistent', async () => {
      const resource = createResource({ targetUrl });
      undiciFetchMock.mockResolvedValue(new Response('ok', { status: 200 }));

      await resource.fetch(targetUrl);
      await resource.fetch(targetUrl);
      await resource.fetch(targetUrl, { method: 'POST' });

      expect(Agent).toHaveBeenCalledTimes(2);
    });

    it('creates separate dispatchers for different destination policies', async () => {
      // Different proxy policies for different hosts
      networkSettings.getProxySettings.mockReturnValue({
        proxyUrl: 'https://proxy.example.com:8080',
        proxyBypassHosts: new Set(['mcp-server.example.com']),
        proxyOnlyHosts: undefined,
        proxyHeaders: {},
        proxySSLSettings: { verificationMode: 'full' as const },
      });

      const resource = createResource({ targetUrl });

      const redirectUrl = 'https://allowed.example.com/v1';
      const finalResponse = new Response('ok', { status: 200 });
      undiciFetchMock
        .mockResolvedValueOnce(mockRedirectResponse(302, redirectUrl))
        .mockResolvedValueOnce(finalResponse);

      await resource.fetch(targetUrl);

      // The original host bypasses proxy (Agent); the redirect host uses ProxyAgent
      expect(Agent).toHaveBeenCalledTimes(1);
      expect(ProxyAgent).toHaveBeenCalledTimes(1);
    });

    it('uses a direct connection when the host is not in proxyOnlyHosts', async () => {
      networkSettings.getProxySettings.mockReturnValue({
        proxyUrl: 'https://proxy.example.com:8080',
        proxyBypassHosts: undefined,
        proxyOnlyHosts: new Set(['other.example.com']),
        proxyHeaders: {},
        proxySSLSettings: { verificationMode: 'full' },
      });
      undiciFetchMock.mockResolvedValueOnce(new Response('ok', { status: 200 }));

      const resource = createResource({ targetUrl });
      await resource.fetch(targetUrl);

      expect(Agent).toHaveBeenCalledTimes(1);
      expect(ProxyAgent).not.toHaveBeenCalled();
    });

    it('applies global certificates and TLS settings to direct connections', async () => {
      const sslSettings = {
        verificationMode: 'certificate' as const,
        cert: Buffer.from('client certificate'),
        key: Buffer.from('client key'),
        pfx: Buffer.from('client pfx'),
        passphrase: 'secret',
        ca: Buffer.from('certificate authority'),
        allowPartialTrustChain: true,
      };
      networkSettings.getSslSettings.mockReturnValue(sslSettings);
      undiciFetchMock.mockResolvedValueOnce(new Response('ok', { status: 200 }));

      const resource = createResource({ targetUrl });
      await resource.fetch(targetUrl);

      expect(Agent).toHaveBeenCalledWith({
        connect: expect.objectContaining({
          cert: sslSettings.cert,
          key: sslSettings.key,
          pfx: sslSettings.pfx,
          passphrase: sslSettings.passphrase,
          ca: sslSettings.ca,
          allowPartialTrustChain: sslSettings.allowPartialTrustChain,
          rejectUnauthorized: true,
          checkServerIdentity: expect.any(Function),
        }),
        headersTimeout: 60_000,
        bodyTimeout: 0,
      });
    });

    it('applies custom host CA data and verification mode overrides', async () => {
      networkSettings.getSslSettings.mockReturnValue({
        verificationMode: 'certificate',
      });
      networkSettings.getCustomHostSettings.mockReturnValue({
        url: 'https://mcp-server.example.com:443',
        ssl: {
          certificateAuthoritiesData: 'custom host ca',
          verificationMode: 'full',
        },
      });
      undiciFetchMock.mockResolvedValueOnce(new Response('ok', { status: 200 }));

      const resource = createResource({ targetUrl });
      await resource.fetch(targetUrl);

      const connectOptions = (Agent as unknown as jest.Mock).mock.calls[0][0].connect;
      expect(connectOptions).toEqual(
        expect.objectContaining({
          ca: Buffer.from('custom host ca'),
          rejectUnauthorized: true,
        })
      );
      expect(connectOptions.checkServerIdentity).toBeUndefined();
    });

    it('applies target and proxy TLS settings independently', async () => {
      const targetCa = Buffer.from('target ca');
      const proxyCa = Buffer.from('proxy ca');
      networkSettings.getSslSettings.mockReturnValue({
        verificationMode: 'full',
        ca: targetCa,
      });
      networkSettings.getProxySettings.mockReturnValue({
        proxyUrl: 'https://proxy.example.com:8080',
        proxyBypassHosts: undefined,
        proxyOnlyHosts: undefined,
        proxyHeaders: { 'Proxy-Authorization': 'Basic token' },
        proxySSLSettings: {
          verificationMode: 'none',
          ca: proxyCa,
        },
      });
      undiciFetchMock.mockResolvedValueOnce(new Response('ok', { status: 200 }));

      const resource = createResource({ targetUrl });
      await resource.fetch(targetUrl);

      expect(ProxyAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          requestTls: expect.objectContaining({
            ca: targetCa,
            rejectUnauthorized: true,
          }),
          proxyTls: expect.objectContaining({
            ca: proxyCa,
            rejectUnauthorized: false,
          }),
          headers: { 'Proxy-Authorization': 'Basic token' },
          headersTimeout: 60_000,
          bodyTimeout: 0,
        })
      );
    });
  });

  describe('authentication headers', () => {
    it('reads fresh authentication headers for each fetch', async () => {
      const getAuthHeaders = jest
        .fn<Promise<Record<string, string>>, []>()
        .mockResolvedValueOnce({ Authorization: 'Bearer a' })
        .mockResolvedValueOnce({ Authorization: 'Bearer b' });
      const resource = createResource({ targetUrl, getAuthHeaders });
      undiciFetchMock.mockResolvedValue(new Response('ok', { status: 200 }));

      await resource.fetch(targetUrl);
      await resource.fetch(targetUrl);

      expect(getAuthHeaders).toHaveBeenCalledTimes(2);
      expect((undiciFetchMock.mock.calls[0][1].headers as Headers).get('authorization')).toBe(
        'Bearer a'
      );
      expect((undiciFetchMock.mock.calls[1][1].headers as Headers).get('authorization')).toBe(
        'Bearer b'
      );
    });

    it('overwrites SDK init authentication headers with current credentials', async () => {
      const resource = createResource({
        targetUrl,
        getAuthHeaders: async () => ({ Authorization: 'Bearer current' }),
      });
      undiciFetchMock.mockResolvedValueOnce(new Response('ok', { status: 200 }));

      await resource.fetch(targetUrl, {
        headers: { Authorization: 'Bearer sdk-init' },
      });

      expect((undiciFetchMock.mock.calls[0][1].headers as Headers).get('authorization')).toBe(
        'Bearer current'
      );
    });

    it('rejects only the fetch when authentication headers fail', async () => {
      const authError = new Error('token client failed');
      const getAuthHeaders = jest
        .fn<Promise<Record<string, string>>, []>()
        .mockRejectedValueOnce(authError)
        .mockResolvedValueOnce({});
      const resource = createResource({ targetUrl, getAuthHeaders });
      undiciFetchMock.mockResolvedValueOnce(new Response('ok', { status: 200 }));

      await expect(resource.fetch(targetUrl)).rejects.toBe(authError);
      await expect(resource.fetch(targetUrl)).resolves.toEqual(expect.any(Response));
      expect(undiciFetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('redirect behaviour', () => {
    it.each([
      [301, 'GET', undefined],
      [302, 'GET', undefined],
      [303, 'GET', undefined],
      [307, 'POST', '{"data":true}'],
      [308, 'POST', '{"data":true}'],
    ])('handles redirect status %s', async (status, expectedMethod, expectedBody) => {
      const resource = createResource({ targetUrl });

      undiciFetchMock
        .mockResolvedValueOnce(mockRedirectResponse(status, 'https://allowed.example.com/v1'))
        .mockResolvedValueOnce(new Response('final', { status: 200 }));

      await resource.fetch(targetUrl, { method: 'POST', body: '{"data":true}' });

      const { method, body } = undiciFetchMock.mock.calls[1][1];
      expect(method).toBe(expectedMethod);
      expect(body).toBe(expectedBody);
    });

    it('strips credential-derived headers and mcp-session-id on cross-origin redirect', async () => {
      const resource = createFetchResource({
        networkSettings,
        logger,
        targetUrl,
        getAuthHeaders: async () => ({
          'X-API-Key': 'secret-key',
          Authorization: 'Bearer secret',
        }),
      });

      undiciFetchMock
        .mockResolvedValueOnce(mockRedirectResponse(307, 'https://allowed.example.com/v1'))
        .mockResolvedValueOnce(new Response('final', { status: 200 }));

      await resource.fetch(targetUrl, {
        method: 'POST',
        headers: { 'mcp-session-id': 'session-1', 'X-API-Key': 'secret-key' },
      });

      const redirectHeaders = undiciFetchMock.mock.calls[1][1].headers as Headers;
      expect(redirectHeaders.has('authorization')).toBe(false);
      expect(redirectHeaders.has('x-api-key')).toBe(false);
      expect(redirectHeaders.has('mcp-session-id')).toBe(false);
    });

    it('does not restore stripped credentials on a later redirect hop', async () => {
      const resource = createFetchResource({
        networkSettings,
        logger,
        targetUrl,
        getAuthHeaders: async () => ({
          Authorization: 'Bearer secret',
          'X-API-Key': 'secret-key',
        }),
      });

      undiciFetchMock
        .mockResolvedValueOnce(mockRedirectResponse(307, 'https://allowed.example.com/hop-1'))
        .mockResolvedValueOnce(mockRedirectResponse(307, 'https://allowed.example.com/hop-2'))
        .mockResolvedValueOnce(new Response('final', { status: 200 }));

      await resource.fetch(targetUrl, {
        method: 'POST',
        headers: { 'mcp-session-id': 'session-1' },
      });

      const secondHopHeaders = undiciFetchMock.mock.calls[2][1].headers as Headers;
      expect(secondHopHeaders.has('authorization')).toBe(false);
      expect(secondHopHeaders.has('x-api-key')).toBe(false);
      expect(secondHopHeaders.has('mcp-session-id')).toBe(false);
    });

    it('preserves authorization and session headers on same-origin redirect', async () => {
      const resource = createFetchResource({
        networkSettings,
        logger,
        targetUrl,
        getAuthHeaders: async () => ({
          Authorization: 'Bearer secret',
          'X-API-Key': 'secret-key',
        }),
      });

      undiciFetchMock
        .mockResolvedValueOnce(mockRedirectResponse(307, 'https://mcp-server.example.com/v2/mcp'))
        .mockResolvedValueOnce(new Response('final', { status: 200 }));

      await resource.fetch(targetUrl, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer secret',
          'X-API-Key': 'secret-key',
          'mcp-session-id': 'session-1',
          'Content-Type': 'application/json',
        },
      });

      const redirectInit = undiciFetchMock.mock.calls[1][1];
      const headers =
        redirectInit.headers instanceof Headers
          ? Object.fromEntries((redirectInit.headers as Headers).entries())
          : redirectInit.headers;
      expect(headers).toHaveProperty('authorization', 'Bearer secret');
      expect(headers).toHaveProperty('x-api-key', 'secret-key');
      expect(headers).toHaveProperty('mcp-session-id', 'session-1');
    });

    it('strips the current authentication header names on cross-origin redirects', async () => {
      const getAuthHeaders = jest
        .fn<Promise<Record<string, string>>, []>()
        .mockResolvedValueOnce({ 'X-API-Key': 'secret-key' })
        .mockResolvedValueOnce({ Authorization: 'Bearer secret' });
      const resource = createResource({ targetUrl, getAuthHeaders });

      undiciFetchMock
        .mockResolvedValueOnce(mockRedirectResponse(307, 'https://allowed.example.com/v1'))
        .mockResolvedValueOnce(new Response('first', { status: 200 }))
        .mockResolvedValueOnce(mockRedirectResponse(307, 'https://allowed.example.com/v1'))
        .mockResolvedValueOnce(new Response('second', { status: 200 }));

      await resource.fetch(targetUrl, { method: 'POST' });
      await resource.fetch(targetUrl, { method: 'POST' });

      const firstRedirectHeaders = undiciFetchMock.mock.calls[1][1].headers as Headers;
      expect(firstRedirectHeaders.has('x-api-key')).toBe(false);

      const secondRedirectHeaders = undiciFetchMock.mock.calls[3][1].headers as Headers;
      expect(secondRedirectHeaders.has('authorization')).toBe(false);
    });

    it('keeps a POST→GET redirect classified as finite', async () => {
      const resource = createResource({ targetUrl });

      undiciFetchMock
        .mockResolvedValueOnce(mockRedirectResponse(302, 'https://allowed.example.com/v1'))
        .mockResolvedValueOnce(new Response('final', { status: 200 }));

      await resource.fetch(targetUrl, { method: 'POST', body: '{"data":true}' });

      expect(Agent).toHaveBeenCalledTimes(2);
      expect(Agent).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          bodyTimeout: 60_000,
          maxResponseSize: 1_000_000,
        })
      );
      expect(Agent).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          bodyTimeout: 60_000,
          maxResponseSize: 1_000_000,
        })
      );
    });

    it('throws when max redirects are exceeded', async () => {
      const resource = createResource({ targetUrl });

      undiciFetchMock.mockResolvedValue(
        mockRedirectResponse(302, 'https://allowed.example.com/loop')
      );

      await expect(resource.fetch(targetUrl)).rejects.toThrow('Max redirects (20) exceeded');
      expect(undiciFetchMock).toHaveBeenCalledTimes(21);
    });

    it('throws when a redirect is missing the Location header', async () => {
      const resource = createResource({ targetUrl });

      undiciFetchMock.mockResolvedValueOnce(mockRedirectResponse(302, null));

      await expect(resource.fetch(targetUrl)).rejects.toThrow(
        'Redirect response 302 missing Location header'
      );
    });
  });

  describe('response settings', () => {
    it.each(['application/json', 'text/event-stream'])(
      'applies the finite response policy to %s',
      async (contentType) => {
        networkSettings.getResponseSettings.mockReturnValue({
          maxContentLength: 64,
          timeout: 60_000,
        });
        undiciFetchMock.mockResolvedValueOnce(
          new Response('data: hello\n\n', {
            status: 200,
            headers: { 'content-type': contentType },
          })
        );

        const resource = createResource({ targetUrl });
        await resource.fetch(targetUrl, { method: 'POST' });

        expect(Agent).toHaveBeenCalledWith(
          expect.objectContaining({
            maxResponseSize: 64,
            bodyTimeout: 60_000,
          })
        );
      }
    );

    it('does not set maxResponseSize or bodyTimeout for persistent GET', async () => {
      networkSettings.getResponseSettings.mockReturnValue({
        maxContentLength: 5,
        timeout: 12_345,
      });
      undiciFetchMock.mockResolvedValueOnce(new Response('ok'));

      const resource = createResource({ targetUrl });
      await resource.fetch(targetUrl, { method: 'GET' });

      const agentOptions = (Agent as unknown as jest.Mock).mock.calls[0][0];
      expect(agentOptions).toEqual(
        expect.objectContaining({
          headersTimeout: 12_345,
          bodyTimeout: 0,
        })
      );
      expect(agentOptions).not.toHaveProperty('maxResponseSize');
    });

    it('applies the same finite policy to ProxyAgent', async () => {
      networkSettings.getProxySettings.mockReturnValue({
        proxyUrl: 'https://proxy.example.com:8080',
        proxyBypassHosts: undefined,
        proxyOnlyHosts: undefined,
        proxyHeaders: {},
        proxySSLSettings: { verificationMode: 'full' as const },
      });
      networkSettings.getResponseSettings.mockReturnValue({
        maxContentLength: 2_048,
        timeout: 12_345,
      });
      undiciFetchMock.mockResolvedValueOnce(new Response('ok'));

      const resource = createResource({ targetUrl });
      await resource.fetch(targetUrl, { method: 'POST' });

      expect(ProxyAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          headersTimeout: 12_345,
          bodyTimeout: 12_345,
          maxResponseSize: 2_048,
        })
      );
    });

    it('reuses one finite timeout signal across redirects without accumulating abort listeners', async () => {
      const resource = createResource({ targetUrl });
      const controller = new AbortController();
      const addSpy = jest.spyOn(controller.signal, 'addEventListener');

      undiciFetchMock
        .mockResolvedValueOnce(mockRedirectResponse(307, 'https://allowed.example.com/hop-1'))
        .mockResolvedValueOnce(mockRedirectResponse(307, 'https://allowed.example.com/hop-2'))
        .mockResolvedValueOnce(new Response('final', { status: 200 }));

      await resource.fetch(targetUrl, {
        method: 'POST',
        signal: controller.signal,
      });

      // Combined once for the logical request; redirect hops reuse that signal.
      expect(addSpy.mock.calls.filter(([type]) => type === 'abort')).toHaveLength(1);
      addSpy.mockRestore();
    });
  });

  describe('SSE passthrough', () => {
    it.each(['GET', 'POST'])('passes a %s SSE response through as a stream', async (method) => {
      const resource = createResource({ targetUrl });

      const sseResponse = new Response('data: hello\n\n', {
        status: 200,
        headers: { 'content-type': 'text/event-stream; charset=utf-8' },
      });
      undiciFetchMock.mockResolvedValueOnce(sseResponse);

      const result = await resource.fetch(targetUrl, { method });
      expect(result).toBe(sseResponse);
    });
  });

  describe('User-Agent', () => {
    it('applies a custom User-Agent when provided', async () => {
      const resource = createResource({
        targetUrl,
        userAgent: 'kibana-mcp-client elastic (project:proj-abc)',
      });

      undiciFetchMock.mockResolvedValueOnce(new Response('ok', { status: 200 }));

      await resource.fetch(targetUrl);

      const requestInit = undiciFetchMock.mock.calls[0][1];
      const headers = requestInit.headers as Headers;
      const ua = headers.get('user-agent');
      expect(ua).toContain('elastic');
      expect(ua).toContain('proj-abc');
    });

    it('applies the default User-Agent when none is provided', async () => {
      const resource = createResource({ targetUrl });

      undiciFetchMock.mockResolvedValueOnce(new Response('ok', { status: 200 }));

      await resource.fetch(targetUrl);

      const requestInit = undiciFetchMock.mock.calls[0][1];
      const headers = requestInit.headers as Headers;
      expect(headers.get('user-agent')).toBe('kibana-mcp-client');
    });
  });

  describe('close()', () => {
    it('destroys all cached dispatchers', async () => {
      const resource = createResource({ targetUrl });

      undiciFetchMock.mockResolvedValueOnce(new Response('ok', { status: 200 }));
      await resource.fetch(targetUrl);

      await resource.close();

      const agentInstance = (Agent as unknown as jest.Mock).mock.results[0].value;
      expect(agentInstance.destroy).toHaveBeenCalledTimes(1);
      expect(agentInstance.close).not.toHaveBeenCalled();
    });

    it('finishes immediately while a GET is still in flight', async () => {
      const resource = createResource({ targetUrl });
      undiciFetchMock.mockReturnValue(new Promise(() => undefined));

      void resource.fetch(targetUrl, { method: 'GET' });
      await Promise.resolve();

      await expect(resource.close()).resolves.toBeUndefined();

      const agentInstance = (Agent as unknown as jest.Mock).mock.results[0].value;
      expect(agentInstance.destroy).toHaveBeenCalledTimes(1);
      expect(agentInstance.close).not.toHaveBeenCalled();
    });

    it('is idempotent: calling close() twice does not throw', async () => {
      const resource = createResource({ targetUrl });

      undiciFetchMock.mockResolvedValueOnce(new Response('ok', { status: 200 }));
      await resource.fetch(targetUrl);

      await expect(resource.close()).resolves.toBeUndefined();
      await expect(resource.close()).resolves.toBeUndefined();

      const agentInstance = (Agent as unknown as jest.Mock).mock.results[0].value;
      expect(agentInstance.destroy).toHaveBeenCalledTimes(1);
    });

    it('rejects requests after the resource is closed', async () => {
      const resource = createResource({ targetUrl });
      await resource.close();

      await expect(resource.fetch(targetUrl)).rejects.toThrow('MCP fetch resource is closed.');
      expect(undiciFetchMock).not.toHaveBeenCalled();
    });
  });
});
