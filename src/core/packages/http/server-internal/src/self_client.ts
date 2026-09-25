/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Dispatcher } from 'undici';
import type { Logger } from '@kbn/logging';
import type {
  AuthHeaders,
  HttpSelfFetchHeaders,
  HttpSelfFetchOptions,
  HttpSelfResponse,
  HttpSelfScopedClient,
  HttpSelfService,
  HttpServerInfo,
  IAuthHeadersStorage,
  IBasePath,
  KibanaRequest,
} from '@kbn/core-http-server';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { UIAM_INTERNAL_CALLER_ATTESTATION_HEADER } from '@kbn/core-security-server';
import { getSpaceUrlPrefix } from '@kbn/core-spaces-common';
import type { HttpConfig } from './http_config';
import { SelfHttpDispatcherProvider } from './self_client_dispatcher';
import { SELF_CALL_HEADER } from './self_client_observer';

const JSON_CONTENT = /^(application\/(json|x-javascript)|text\/(x-)?javascript|x-json)(;.*)?$/;
const DEFAULT_TIMEOUT_MS = 60_000;
const KIBANA_VERSION_HEADER = 'kbn-version';

/**
 * Returns the UIAM internal-caller attestation for `outboundAuthorization`, or nothing.
 * @internal
 */
export type SelfClientUiamAttestationGetter = (
  request: KibanaRequest,
  outboundAuthorization: string | null
) => string | undefined;

export const SELF_CALL_RECURSION_ERROR =
  'Refusing Kibana self HTTP call because a self call cannot issue another self call.';
export const SELF_CALL_MTLS_ERROR =
  'Kibana self HTTP calls do not support local calls when server.ssl.clientAuthentication is required.';

const FORWARDED_REQUEST_HEADER_NAMES = new Set([
  'accept',
  'accept-encoding',
  'accept-language',
  'content-type',
  'origin',
  'referer',
  'user-agent',
  'x-elastic-product-origin',
  'x-kbn-context',
]);

interface HttpSelfClientParams {
  readonly basePath: IBasePath;
  readonly authRequestHeaders: IAuthHeadersStorage;
  readonly getServerInfo: () => HttpServerInfo;
  readonly getHttpConfig: () => HttpConfig;
  readonly kibanaVersion: string;
  readonly log: Logger;
  readonly target: 'auto' | 'local';
  readonly getUiamAttestationGetter?: () => SelfClientUiamAttestationGetter | undefined;
}

interface SelfFetchInit extends RequestInit {
  dispatcher?: Dispatcher;
}

export interface InternalHttpSelfService extends HttpSelfService {
  close(): Promise<void>;
}

interface HttpSelfFetchError<TResponseBody = unknown> extends Error {
  readonly request: Request;
  readonly response?: Response;
  readonly body?: TResponseBody;
}

export const createInternalHttpSelfClient = (
  params: HttpSelfClientParams
): InternalHttpSelfService => {
  const dispatcherProvider = new SelfHttpDispatcherProvider(params);
  return {
    asScoped: (request) => new InternalHttpSelfScopedClient(params, request, dispatcherProvider),
    close: () => dispatcherProvider.close(),
  };
};

class InternalHttpSelfScopedClient implements HttpSelfScopedClient {
  constructor(
    private readonly params: HttpSelfClientParams,
    private readonly request: KibanaRequest,
    private readonly dispatcherProvider: SelfHttpDispatcherProvider
  ) {}

  public async fetch<TResponseBody = unknown, TRequestBody = unknown>(
    path: string,
    options: HttpSelfFetchOptions<TRequestBody> = {}
  ): Promise<TResponseBody | HttpSelfResponse<TResponseBody, TRequestBody>> {
    validateFetchArguments(path, options);
    this.validateRequestContext(options.target);

    const fetchOptions = { ...options, path };
    let request = this.createRequest(path, options);
    let response: Response | undefined;
    this.logAttempt(request.method, options.target);
    const cleanup: Array<() => void> = [];

    try {
      const signal = this.createSignal(options, cleanup);
      const fetchInit: SelfFetchInit = {
        signal,
        redirect: 'manual',
        dispatcher: this.dispatcherProvider.get(
          new URL(request.url),
          this.getEffectiveTarget(options.target)
        ),
      };
      const maxRedirects = this.params.getHttpConfig().selfHttp.maxRedirects ?? 0;
      const followed = await followSameOriginRedirects(request, fetchInit, maxRedirects);
      request = followed.request;
      response = followed.response;

      if (options.rawResponse) {
        this.logHttpStatus(request, response, options.target);
        return { fetchOptions, request, response };
      }

      const body = (await parseResponseBody(response)) as TResponseBody;

      if (!response.ok) {
        throw createHttpSelfFetchError(
          `Kibana self HTTP call failed: ${describeSelfCall(request, response)}`,
          request,
          response,
          body
        );
      }

      if (options.asResponse) {
        return { fetchOptions, request, response, body };
      }

      return body;
    } catch (error) {
      const selfError = isHttpSelfFetchError(error)
        ? error
        : createHttpSelfFetchError(
            `Kibana self HTTP call failed: ${describeSelfCall(
              request,
              response
            )}: ${describeErrorCause(error)}`,
            request,
            response,
            undefined,
            error
          );
      this.logFailure(selfError, options.target);
      throw selfError;
    } finally {
      cleanup.forEach((clean) => clean());
    }
  }

  private logAttempt(targetMethod: string, target?: 'local'): void {
    const targetMode = this.getEffectiveTarget(target) === 'local' ? 'local' : 'public';

    this.params.log.debug(() => 'Kibana scoped self HTTP call attempted', {
      labels: {
        self_http_source_method: this.request.route.method.toUpperCase(),
        self_http_source_route_template: this.request.route.path,
        self_http_target_method: targetMethod,
        self_http_target_mode: targetMode,
      },
    });
  }

  private logHttpStatus(request: Request, response: Response, target?: 'local'): void {
    if (response.status < 500) {
      return;
    }
    this.writeFailureLog(
      'warn',
      createHttpSelfFetchError(
        `Kibana self HTTP call failed: ${describeSelfCall(request, response)}`,
        request,
        response
      ),
      target
    );
  }

  private logFailure(error: HttpSelfFetchError, target?: 'local'): void {
    const statusCode = error.response?.status;
    if (statusCode === 304 || (statusCode !== undefined && statusCode >= 400 && statusCode < 500)) {
      return;
    }
    this.writeFailureLog(
      statusCode !== undefined && statusCode >= 500 ? 'warn' : 'error',
      error,
      target
    );
  }

  private writeFailureLog(
    level: 'warn' | 'error',
    error: HttpSelfFetchError,
    target?: 'local'
  ): void {
    const targetMode = this.getEffectiveTarget(target) === 'local' ? 'local' : 'public';
    const statusCode = error.response?.status;
    const errorCode = getErrorCode(error);

    this.params.log[level]('Kibana scoped self HTTP call failed', {
      error: projectLoggedError(error),
      http: {
        request: { method: error.request.method },
        ...(statusCode !== undefined ? { response: { status_code: statusCode } } : {}),
      },
      labels: {
        self_http_target_method: error.request.method,
        self_http_target_mode: targetMode,
        self_http_target_origin: describeSelfCallOrigin(error.request),
        ...(statusCode !== undefined
          ? { self_http_status_class: `${Math.floor(statusCode / 100)}xx` }
          : {}),
        ...(errorCode ? { self_http_error_code: errorCode } : {}),
      },
    });
  }

  private validateRequestContext(target?: 'local'): void {
    if (this.request.headers[SELF_CALL_HEADER] !== undefined) {
      throw new Error(SELF_CALL_RECURSION_ERROR);
    }

    const { ssl } = this.params.getHttpConfig();
    if (
      ssl.enabled &&
      ssl.requestCert &&
      ssl.rejectUnauthorized &&
      this.getEffectiveTarget(target) === 'local'
    ) {
      throw new Error(SELF_CALL_MTLS_ERROR);
    }
  }

  private createRequest<TRequestBody>(
    path: string,
    options: HttpSelfFetchOptions<TRequestBody>
  ): Request {
    const method = options.method ?? 'GET';
    const url = this.createUrl(path, options);
    const headers = this.createHeaders(options);
    if (options.body !== undefined && options.rawBody !== undefined) {
      throw new Error('Invalid self HTTP options, body and rawBody are mutually exclusive.');
    }
    if (
      options.rawBody !== undefined &&
      options.rawBody !== null &&
      !isBufferedRawBody(options.rawBody)
    ) {
      throw new Error('Invalid self HTTP rawBody, only buffered body types are supported.');
    }
    const body =
      options.rawBody !== undefined ? options.rawBody : serializeBody(headers, options.body);

    return new Request(url, {
      method,
      headers,
      body,
    });
  }

  private createUrl<TRequestBody>(path: string, options: HttpSelfFetchOptions<TRequestBody>): URL {
    const baseUrl = this.getBaseUrl(options.target);
    const pathname =
      options.prependBasePath === false ? path : `${this.getRequestBasePath()}${path}`;
    const url = new URL(pathname, baseUrl);

    if (url.origin !== baseUrl.origin) {
      throw new Error(
        `Invalid self HTTP path "${path}". Resolved URL origin must match Kibana's origin.`
      );
    }

    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value === undefined || value === null) {
          continue;
        }
        const values = Array.isArray(value) ? value : [value];
        values.forEach((entry) => url.searchParams.append(key, String(entry)));
      }
    }

    return url;
  }

  private getEffectiveTarget(target?: 'local'): 'local' | 'public' {
    if (target === 'local') return 'local';
    return this.params.target === 'auto' && this.params.basePath.publicBaseUrl ? 'public' : 'local';
  }

  private getRequestBasePath(): string {
    if (!this.request.isFakeRequest) {
      return this.request.basePath;
    }
    return `${this.params.basePath.serverBasePath}${getSpaceUrlPrefix(this.request.spaceId)}`;
  }

  private getBaseUrl(target?: 'local'): URL {
    if (this.getEffectiveTarget(target) === 'public' && this.params.basePath.publicBaseUrl) {
      return new URL(this.params.basePath.publicBaseUrl);
    }

    const serverInfo = this.params.getServerInfo();
    if (serverInfo.protocol === 'socket') {
      throw new Error('Cannot call Kibana self HTTP APIs when the server protocol is "socket".');
    }

    const hostname =
      serverInfo.hostname === '0.0.0.0' || serverInfo.hostname === '::'
        ? 'localhost'
        : serverInfo.hostname;

    return new URL(`${serverInfo.protocol}://${hostname}:${serverInfo.port}`);
  }

  private createHeaders<TRequestBody>(options: HttpSelfFetchOptions<TRequestBody>): Headers {
    const headers = new Headers();

    const authHeaders = this.request.isFakeRequest
      ? getFakeRequestAuthHeaders(this.request)
      : this.params.authRequestHeaders.get(this.request);
    addHeaders(headers, authHeaders);
    if (options.forwardRequestHeaders) {
      addHeaders(headers, getForwardedRequestHeaders(this.request));
    }
    addHeaders(headers, options.headers);

    headers.delete('cookie');
    // Strip the internal-origin header from all self calls before optionally adding Core's marker below.
    headers.delete(X_ELASTIC_INTERNAL_ORIGIN_REQUEST);
    headers.set(KIBANA_VERSION_HEADER, this.params.kibanaVersion);
    headers.set(SELF_CALL_HEADER, 'true');
    headers.set('user-agent', `KibanaSelfHttpClient/${this.params.kibanaVersion}`);

    if (options.version) {
      headers.set(ELASTIC_HTTP_VERSION_HEADER, options.version);
    }

    if (options.access === 'internal') {
      headers.set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'Kibana');
    }

    const getAttestation = this.params.getUiamAttestationGetter?.();
    if (getAttestation) {
      const attestation = getAttestation(this.request, headers.get('authorization'));
      if (attestation) {
        headers.set(UIAM_INTERNAL_CALLER_ATTESTATION_HEADER, attestation);
      }
    }

    return headers;
  }

  private createSignal<TRequestBody>(
    options: HttpSelfFetchOptions<TRequestBody>,
    cleanup: Array<() => void>
  ): AbortSignal {
    const controller = new AbortController();
    const abort = () => {
      if (!controller.signal.aborted) {
        controller.abort();
      }
    };

    const timeoutId = setTimeout(abort, options.timeout ?? DEFAULT_TIMEOUT_MS);
    cleanup.push(() => clearTimeout(timeoutId));

    const requestAbortSubscription = this.request.events.aborted$.subscribe(abort);
    cleanup.push(() => requestAbortSubscription.unsubscribe());

    if (options.signal) {
      if (options.signal.aborted) {
        abort();
      } else {
        options.signal.addEventListener('abort', abort, { once: true });
        cleanup.push(() => options.signal?.removeEventListener('abort', abort));
      }
    }

    return controller.signal;
  }
}

const HTTP_SELF_FETCH_ERROR = Symbol('HttpSelfFetchError');

const createHttpSelfFetchError = <TResponseBody>(
  message: string,
  request: Request,
  response?: Response,
  body?: TResponseBody,
  cause?: unknown
): HttpSelfFetchError<TResponseBody> => {
  const error = new Error(
    message,
    cause === undefined ? undefined : { cause }
  ) as HttpSelfFetchError<TResponseBody>;
  error.name = 'HttpSelfFetchError';
  Object.defineProperties(error, {
    [HTTP_SELF_FETCH_ERROR]: { value: true },
    request: { value: request, enumerable: true },
    response: { value: response, enumerable: true },
    body: { value: body, enumerable: true },
  });
  return error;
};

const isHttpSelfFetchError = (error: unknown): error is HttpSelfFetchError => {
  return (
    error instanceof Error &&
    HTTP_SELF_FETCH_ERROR in error &&
    'request' in error &&
    error.request instanceof Request
  );
};

const describeSelfCallOrigin = (request: Request): string => new URL(request.url).origin;

const describeSelfCall = (request: Request, response?: Response): string => {
  const target = `${request.method} ${describeSelfCallOrigin(request)}`;
  return response ? `${target} → ${response.status}` : target;
};

const describeErrorCause = (error: unknown): string => {
  const coded = findCodedError(error);
  if (coded) {
    return coded.message && coded.message !== coded.code
      ? `${coded.code}: ${coded.message}`
      : coded.code;
  }
  if (
    getErrorName(error) === 'SyntaxError' ||
    getErrorName(getErrorCause(error)) === 'SyntaxError'
  ) {
    return 'invalid JSON response body';
  }
  return getErrorName(error) ?? 'unknown error';
};

const getErrorName = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null || !('name' in error)) {
    return undefined;
  }
  return typeof error.name === 'string' ? error.name : undefined;
};

const getErrorCause = (error: unknown): unknown => {
  return typeof error === 'object' && error !== null && 'cause' in error ? error.cause : undefined;
};

const findCodedError = (error: unknown): { code: string; message: string } | undefined => {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current instanceof Error; depth++) {
    if ('code' in current && typeof current.code === 'string') {
      return { code: current.code, message: current.message };
    }
    current = current.cause;
  }
  return undefined;
};

const getErrorCode = (error: unknown): string | undefined => findCodedError(error)?.code;

interface LoggedErrorProjection {
  name: string;
  message?: string;
  code?: string;
  cause?: LoggedErrorProjection;
}

const projectLoggedError = (error: Error, depth = 0): LoggedErrorProjection => {
  const code = 'code' in error && typeof error.code === 'string' ? error.code : undefined;
  const cause =
    depth < 3 && error.cause instanceof Error
      ? projectLoggedError(error.cause, depth + 1)
      : undefined;
  const includeMessage = HTTP_SELF_FETCH_ERROR in error || code !== undefined;
  return {
    name: error.name,
    ...(includeMessage ? { message: error.message } : {}),
    ...(code ? { code } : {}),
    ...(cause ? { cause } : {}),
  };
};

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

const discardResponseBody = (response: Response): void => {
  void response.body?.cancel();
};

// Fetch: 301/302 rewrite POST to GET; 303 rewrites every method except GET/HEAD.
const redirectUsesGet = (method: string, status: number): boolean => {
  if (status === 303) {
    return method !== 'GET' && method !== 'HEAD';
  }
  return (status === 301 || status === 302) && method === 'POST';
};

const headersWithoutBodyMetadata = (headers: Headers): Headers => {
  const next = new Headers(headers);
  next.delete('content-encoding');
  next.delete('content-language');
  next.delete('content-length');
  next.delete('content-location');
  next.delete('content-type');
  next.delete('transfer-encoding');
  return next;
};

const followSameOriginRedirects = async (
  initialRequest: Request,
  fetchInit: SelfFetchInit,
  maxRedirects: number
): Promise<{ request: Request; response: Response }> => {
  const origin = new URL(initialRequest.url).origin;
  const visited = new Set<string>();
  let currentRequest = initialRequest;
  let hops = 0;
  let response = await fetchRedirectHop(currentRequest, fetchInit, visited);

  while (REDIRECT_STATUSES.has(response.status)) {
    if (hops >= maxRedirects) {
      discardResponseBody(response);
      throw createHttpSelfFetchError(
        maxRedirects === 0
          ? `Kibana self HTTP call received a redirect (${response.status}) but server.selfHttp.maxRedirects is 0.`
          : `Kibana self HTTP call exceeded server.selfHttp.maxRedirects (${maxRedirects}).`,
        currentRequest,
        response
      );
    }

    const location = response.headers.get('location');
    if (!location) {
      discardResponseBody(response);
      throw createHttpSelfFetchError(
        'Kibana self HTTP call received a redirect without a Location header.',
        currentRequest,
        response
      );
    }

    let nextUrl: URL;
    try {
      nextUrl = new URL(location, currentRequest.url);
    } catch {
      discardResponseBody(response);
      throw createHttpSelfFetchError(
        'Kibana self HTTP call received a redirect with an invalid Location header.',
        currentRequest,
        response
      );
    }
    if (nextUrl.origin !== origin) {
      discardResponseBody(response);
      throw createHttpSelfFetchError(
        'Kibana self HTTP call refused a cross-origin redirect.',
        currentRequest,
        response
      );
    }

    hops += 1;
    discardResponseBody(response);

    if (redirectUsesGet(currentRequest.method, response.status)) {
      currentRequest = new Request(nextUrl, {
        method: 'GET',
        headers: headersWithoutBodyMetadata(currentRequest.headers),
      });
    } else {
      currentRequest = new Request(nextUrl, currentRequest);
    }

    response = await fetchRedirectHop(currentRequest, fetchInit, visited);
  }

  return { request: currentRequest, response };
};

const fetchRedirectHop = async (
  currentRequest: Request,
  fetchInit: SelfFetchInit,
  visited: Set<string>
): Promise<Response> => {
  const visitKey = `${currentRequest.method}:${currentRequest.url}`;
  if (visited.has(visitKey)) {
    throw createHttpSelfFetchError(
      'Kibana self HTTP call detected a redirect loop.',
      currentRequest
    );
  }
  visited.add(visitKey);
  return fetch(currentRequest.clone(), fetchInit);
};

const validateFetchArguments = <TRequestBody>(
  path: string,
  options: HttpSelfFetchOptions<TRequestBody>
) => {
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) {
    throw new Error(
      `Invalid self HTTP path "${path}". Use a Kibana-relative absolute path such as "/api/status".`
    );
  }

  if (options.rawResponse && !options.asResponse) {
    throw new Error('Invalid self HTTP options, rawResponse = true requires asResponse = true.');
  }

  const invalidHeaders = Object.keys(options.headers ?? {}).filter(isProtectedHeader);

  if (invalidHeaders.length) {
    throw new Error(
      `Invalid self HTTP headers, protected headers are not allowed: [${invalidHeaders.join(',')}]`
    );
  }
};

const isForwardableRequestHeader = (name: string): boolean => {
  const normalizedName = name.toLowerCase();
  return !isProtectedHeader(normalizedName) && FORWARDED_REQUEST_HEADER_NAMES.has(normalizedName);
};

const getFakeRequestAuthHeaders = (request: KibanaRequest): AuthHeaders | undefined => {
  const { authorization } = request.headers;
  return authorization === undefined ? undefined : { authorization };
};

const getForwardedRequestHeaders = (request: KibanaRequest): HttpSelfFetchHeaders => {
  return Object.fromEntries(
    Object.entries(request.headers).filter(
      ([name, value]) => value !== undefined && isForwardableRequestHeader(name)
    )
  ) as HttpSelfFetchHeaders;
};

const isProtectedHeader = (name: string) => {
  const lowerName = name.toLowerCase();
  return (
    lowerName === 'authorization' ||
    lowerName === 'cookie' ||
    lowerName === 'host' ||
    lowerName.startsWith('kbn-') ||
    lowerName === SELF_CALL_HEADER ||
    lowerName.startsWith('x-elastic-internal-') ||
    lowerName === UIAM_INTERNAL_CALLER_ATTESTATION_HEADER
  );
};

const addHeaders = (
  headers: Headers,
  values: AuthHeaders | HttpSelfFetchHeaders | undefined
): void => {
  if (!values) {
    return;
  }

  for (const [name, value] of Object.entries(values)) {
    if (value === undefined) {
      continue;
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => headers.append(name, entry));
    } else {
      headers.set(name, value);
    }
  }
};

const isBufferedRawBody = (body: unknown): boolean =>
  body instanceof FormData ||
  body instanceof Blob ||
  body instanceof URLSearchParams ||
  body instanceof ArrayBuffer ||
  ArrayBuffer.isView(body);

const serializeBody = <TRequestBody>(
  headers: Headers,
  body: HttpSelfFetchOptions<TRequestBody>['body']
): BodyInit | null | undefined => {
  if (body === undefined) {
    return undefined;
  }

  if (body === null) {
    return null;
  }

  if (typeof body === 'string') {
    return body;
  }

  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  return JSON.stringify(body);
};

const parseResponseBody = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get('content-type') ?? '';

  if (JSON_CONTENT.test(contentType)) {
    return await response.json();
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};
