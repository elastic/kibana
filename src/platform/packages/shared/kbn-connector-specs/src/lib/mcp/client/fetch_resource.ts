/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  Agent,
  ProxyAgent,
  fetch as undiciFetch,
  type Dispatcher,
  type RequestInit as UndiciRequestInit,
} from 'undici';
import type { Logger } from '@kbn/logging';
import { getNodeSSLOptions, type CustomHostSettings, type SSLSettings } from '@kbn/actions-utils';
import type { FetchLike } from '@kbn/mcp-client';
import type { ConnectorNetworkSettings } from '../../clients/client_type_spec';

/** Closable fetch bound to one MCP server URL (owns Undici dispatchers). */
export interface McpFetchResource {
  readonly fetch: FetchLike;
  close(): Promise<void>;
}

const DEFAULT_USER_AGENT = 'kibana-mcp-client';
const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 20;
const MCP_SESSION_HEADER = 'mcp-session-id';
const STRIPPED_METHOD_CHANGE_HEADERS = [
  'content-encoding',
  'content-language',
  'content-location',
  'content-type',
];

type RequestClass = 'finite' | 'persistent';

export interface CreateFetchResourceOpts {
  networkSettings: ConnectorNetworkSettings;
  logger: Logger;
  targetUrl: string;
  headers?: Readonly<Record<string, string>>;
  getAuthHeaders: () => Promise<Record<string, string>>;
  userAgent?: string;
}

function buildTlsConnectOptions(
  logger: Logger,
  sslSettings: SSLSettings,
  customHostSettings?: CustomHostSettings
): ReturnType<typeof getNodeSSLOptions> {
  const options = getNodeSSLOptions(logger, sslSettings.verificationMode, sslSettings);

  const hostSsl = customHostSettings?.ssl;
  if (hostSsl) {
    logger.debug(`Creating customized connection settings for: ${customHostSettings.url}`);
    if (hostSsl.certificateAuthoritiesData) {
      options.ca = Buffer.from(hostSsl.certificateAuthoritiesData);
    }
    if (hostSsl.verificationMode) {
      delete options.checkServerIdentity;
      Object.assign(options, getNodeSSLOptions(logger, hostSsl.verificationMode));
    }
  }

  return options;
}

function shouldUseProxy(
  logger: Logger,
  proxySettings: { proxyBypassHosts?: Set<string>; proxyOnlyHosts?: Set<string>; proxyUrl: string },
  targetUrl: string
): boolean {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    logger.warn(
      `error determining proxy state for invalid url "${targetUrl}", using direct connection`
    );
    return false;
  }

  const { hostname } = parsed;

  if (proxySettings.proxyBypassHosts?.has(hostname)) {
    return false;
  }
  if (proxySettings.proxyOnlyHosts && !proxySettings.proxyOnlyHosts.has(hostname)) {
    return false;
  }

  return true;
}

function classifyRequest(method: string): RequestClass {
  return method.toUpperCase() === 'GET' ? 'persistent' : 'finite';
}

function buildDispatcherForUrl(
  networkSettings: ConnectorNetworkSettings,
  logger: Logger,
  targetUrl: string,
  requestClass: RequestClass
): Dispatcher {
  const sslSettings = networkSettings.getSslSettings();
  const proxySettings = networkSettings.getProxySettings();
  const { timeout, maxContentLength } = networkSettings.getResponseSettings();
  const customHostSettings = networkSettings.getCustomHostSettings(targetUrl);
  const tlsOptions = buildTlsConnectOptions(logger, sslSettings, customHostSettings);

  const timeoutOptions =
    timeout > 0
      ? {
          headersTimeout: timeout,
          // Persistent GET SSE streams stay quiet between events; do not idle-timeout the body.
          bodyTimeout: requestClass === 'persistent' ? 0 : timeout,
        }
      : requestClass === 'persistent'
      ? { bodyTimeout: 0 }
      : {};

  const sizeOptions =
    requestClass === 'finite' && maxContentLength > 0 ? { maxResponseSize: maxContentLength } : {};

  if (proxySettings && shouldUseProxy(logger, proxySettings, targetUrl)) {
    let proxyUrl: URL;
    try {
      proxyUrl = new URL(proxySettings.proxyUrl);
    } catch {
      logger.warn(`invalid proxy URL "${proxySettings.proxyUrl}" ignored, using direct connection`);
      return new Agent({ connect: tlsOptions, ...timeoutOptions, ...sizeOptions });
    }

    const proxyTls = getNodeSSLOptions(
      logger,
      proxySettings.proxySSLSettings.verificationMode,
      proxySettings.proxySSLSettings
    );

    return new ProxyAgent({
      uri: proxyUrl.toString(),
      requestTls: tlsOptions,
      proxyTls,
      headers: proxySettings.proxyHeaders,
      ...timeoutOptions,
      ...sizeOptions,
    });
  }

  return new Agent({ connect: tlsOptions, ...timeoutOptions, ...sizeOptions });
}

function stripCrossOriginHeaders(headers: Headers, authHeaderNames: readonly string[]): Headers {
  const sanitized = new Headers(headers);
  sanitized.delete('authorization');
  sanitized.delete(MCP_SESSION_HEADER);
  for (const name of authHeaderNames) {
    sanitized.delete(name);
  }
  return sanitized;
}

/**
 * Prefer platform `AbortSignal.any` (Node 20+). Fall back for Jest/jsdom environments that
 * lack it so unit tests can still exercise finite-request timeout composition.
 */
function combineAbortSignals(signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any(signals);
  }

  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
}

/**
 * Builds a closable fetch resource for one MCP server URL using Actions network settings from
 * {@link BuildContext.networkSettings} (allowlist, TLS, proxy, timeout, body-size limits).
 */
export function createFetchResource({
  networkSettings,
  logger,
  targetUrl,
  headers: defaultHeaders,
  getAuthHeaders,
  userAgent = DEFAULT_USER_AGENT,
}: CreateFetchResourceOpts): McpFetchResource {
  networkSettings.ensureUriAllowed(targetUrl);

  const { timeout } = networkSettings.getResponseSettings();
  const dispatchers = new Map<string, Dispatcher>();
  let closed = false;

  const getOrCreateDispatcher = (url: string, requestClass: RequestClass): Dispatcher => {
    const origin = new URL(url).origin;
    const cacheKey = `${origin}|${requestClass}`;
    let dispatcher = dispatchers.get(cacheKey);
    if (!dispatcher) {
      dispatcher = buildDispatcherForUrl(networkSettings, logger, url, requestClass);
      dispatchers.set(cacheKey, dispatcher);
    }
    return dispatcher;
  };

  const followRedirects = async (
    url: string | URL,
    init: RequestInit | undefined,
    requestClass: RequestClass,
    authHeaderNames: readonly string[],
    redirectCount = 0
  ): Promise<Response> => {
    if (closed) {
      throw new Error('MCP fetch resource is closed.');
    }

    const urlStr = typeof url === 'string' ? url : url.toString();
    const dispatcher = getOrCreateDispatcher(urlStr, requestClass);

    const requestHeaders = new Headers(init?.headers);
    if (!requestHeaders.has('user-agent')) {
      requestHeaders.set('user-agent', userAgent);
    }

    // Use undici's fetch (not the jsdom/whatwg polyfill) so dispatcher timeouts and
    // maxResponseSize are honored in both Kibana server and Jest environments.
    const response = (await undiciFetch(urlStr, {
      ...init,
      headers: requestHeaders,
      redirect: 'manual',
      dispatcher,
    } as UndiciRequestInit)) as unknown as Response;

    if (!REDIRECT_STATUS_CODES.has(response.status)) {
      return response;
    }

    if (redirectCount >= MAX_REDIRECTS) {
      try {
        await response.body?.cancel();
      } catch {
        // ignore
      }
      throw new Error(`Max redirects (${MAX_REDIRECTS}) exceeded`);
    }

    const location = response.headers.get('location');
    if (!location) {
      try {
        await response.body?.cancel();
      } catch {
        // ignore
      }
      throw new Error(`Redirect response ${response.status} missing Location header`);
    }

    const resolvedUrl = new URL(location, urlStr).toString();
    networkSettings.ensureUriAllowed(resolvedUrl);
    logger.debug(`mcp-fetch: following redirect (${response.status}) to ${resolvedUrl}`);

    try {
      await response.body?.cancel();
    } catch {
      // ignore
    }

    const preserveMethod = response.status === 307 || response.status === 308;
    const redirectInit: RequestInit = { ...init, headers: requestHeaders };

    if (!preserveMethod) {
      const sanitizedHeaders = new Headers(redirectInit.headers);
      STRIPPED_METHOD_CHANGE_HEADERS.forEach((h) => sanitizedHeaders.delete(h));
      redirectInit.headers = sanitizedHeaders;
      redirectInit.method = 'GET';
      delete redirectInit.body;
    }

    const requestOrigin = new URL(urlStr).origin;
    const redirectOrigin = new URL(resolvedUrl).origin;
    if (requestOrigin !== redirectOrigin) {
      redirectInit.headers = stripCrossOriginHeaders(
        new Headers(redirectInit.headers),
        authHeaderNames
      );
    }

    return followRedirects(
      resolvedUrl,
      redirectInit,
      requestClass,
      authHeaderNames,
      redirectCount + 1
    );
  };

  const fetchFn: FetchLike = async (url, init) => {
    const urlString = typeof url === 'string' ? url : url.toString();
    networkSettings.ensureUriAllowed(urlString);
    const authHeaders = await getAuthHeaders();
    const method = (init?.method ?? 'GET').toUpperCase();
    const requestClass = classifyRequest(method);
    const headers = new Headers(defaultHeaders);
    new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
    new Headers(authHeaders).forEach((value, key) => headers.set(key, value));

    const callerSignal = init?.signal as AbortSignal | undefined;
    let finiteController: AbortController | undefined;
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    let signal = callerSignal;

    if (requestClass === 'finite' && timeout > 0) {
      // One timeout for the whole finite logical request, reused across every redirect hop.
      finiteController = new AbortController();
      timeoutHandle = setTimeout(() => {
        finiteController?.abort(new Error(`Request timed out after ${timeout}ms`));
      }, timeout);
      signal = callerSignal
        ? combineAbortSignals([callerSignal, finiteController.signal])
        : finiteController.signal;
    }

    try {
      return await followRedirects(
        urlString,
        { ...init, headers, ...(signal ? { signal } : {}) },
        requestClass,
        Object.keys(authHeaders)
      );
    } finally {
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle);
      }
    }
  };

  return {
    fetch: fetchFn,
    async close(): Promise<void> {
      if (closed) {
        return;
      }
      closed = true;
      for (const dispatcher of dispatchers.values()) {
        try {
          // destroy() aborts in-flight GET SSE; close() would wait forever (bodyTimeout: 0).
          dispatcher.destroy();
        } catch {
          // ignore errors on destroy
        }
      }
      dispatchers.clear();
    },
  };
}
