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
import { getSpaceUrlPrefix } from '@kbn/core-spaces-common';
import type { HttpConfig } from './http_config';
import { SelfHttpDispatcherProvider } from './self_client_dispatcher';
import { SELF_CALL_HEADER } from './self_client_observer';

const JSON_CONTENT = /^(application\/(json|x-javascript)|text\/(x-)?javascript|x-json)(;.*)?$/;
const DEFAULT_TIMEOUT_MS = 60_000;
const KIBANA_VERSION_HEADER = 'kbn-version';
export const SELF_CALL_RECURSION_ERROR =
  'Refusing Kibana self HTTP call because a self call cannot issue another self call.';
export const SELF_CALL_MTLS_ERROR =
  'Kibana self HTTP calls do not support server.ssl.clientAuthentication optional or required.';

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
    this.validateRequestContext();

    const fetchOptions = { ...options, path };
    const request = this.createRequest(path, options);
    this.logAttempt(request.method);
    const cleanup: Array<() => void> = [];

    try {
      const signal = this.createSignal(options, cleanup);
      const fetchInit: SelfFetchInit = {
        signal,
        redirect: 'error',
        dispatcher: this.dispatcherProvider.get(new URL(request.url)),
      };
      const response = await fetch(request, fetchInit);

      if (options.rawResponse) {
        return { fetchOptions, request, response };
      }

      const body = (await parseResponseBody(response)) as TResponseBody;

      if (!response.ok) {
        throw createHttpSelfFetchError(response.statusText, request, response, body);
      }

      if (options.asResponse) {
        return { fetchOptions, request, response, body };
      }

      return body;
    } catch (error) {
      if (isHttpSelfFetchError(error)) {
        throw error;
      }
      throw createHttpSelfFetchError((error as Error).message, request);
    } finally {
      cleanup.forEach((clean) => clean());
    }
  }

  private logAttempt(targetMethod: string): void {
    const targetMode =
      this.params.target === 'auto' && this.params.basePath.publicBaseUrl ? 'public' : 'local';

    this.params.log.debug(() => 'Kibana scoped self HTTP call attempted', {
      labels: {
        self_http_source_method: this.request.route.method.toUpperCase(),
        self_http_source_route_template: this.request.route.path,
        self_http_target_method: targetMethod,
        self_http_target_mode: targetMode,
      },
    });
  }

  private validateRequestContext(): void {
    if (this.request.headers[SELF_CALL_HEADER] !== undefined) {
      throw new Error(SELF_CALL_RECURSION_ERROR);
    }

    const { ssl } = this.params.getHttpConfig();
    if (ssl.enabled && ssl.requestCert) {
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
    const body = serializeBody(headers, options.body);

    return new Request(url, {
      method,
      headers,
      body,
    });
  }

  private createUrl<TRequestBody>(path: string, options: HttpSelfFetchOptions<TRequestBody>): URL {
    const baseUrl = this.getBaseUrl();
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

  private getRequestBasePath(): string {
    if (!this.request.isFakeRequest) {
      return this.request.basePath;
    }
    return `${this.params.basePath.serverBasePath}${getSpaceUrlPrefix(this.request.spaceId)}`;
  }

  private getBaseUrl(): URL {
    if (this.params.target === 'auto' && this.params.basePath.publicBaseUrl) {
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

const createHttpSelfFetchError = <TResponseBody>(
  message: string,
  request: Request,
  response?: Response,
  body?: TResponseBody
): HttpSelfFetchError<TResponseBody> => {
  const error = new Error(message) as HttpSelfFetchError<TResponseBody>;
  error.name = 'HttpSelfFetchError';
  Object.defineProperties(error, {
    request: { value: request, enumerable: true },
    response: { value: response, enumerable: true },
    body: { value: body, enumerable: true },
  });
  return error;
};

const isHttpSelfFetchError = (error: unknown): error is HttpSelfFetchError => {
  return error instanceof Error && error.name === 'HttpSelfFetchError';
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
    lowerName.startsWith('x-elastic-internal-')
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
