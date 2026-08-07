/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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

const JSON_CONTENT = /^(application\/(json|x-javascript)|text\/(x-)?javascript|x-json)(;.*)?$/;
const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_SELF_CALL_DEPTH = 4;
const SELF_CALL_HEADER = 'x-kbn-self-call';
const SELF_CALL_DEPTH_HEADER = 'x-kbn-self-call-depth';
const KIBANA_VERSION_HEADER = 'kbn-version';

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
  readonly kibanaVersion: string;
  readonly target: 'auto' | 'local';
}

interface HttpSelfFetchError<TResponseBody = unknown> extends Error {
  readonly request: Request;
  readonly response?: Response;
  readonly body?: TResponseBody;
}

export const createInternalHttpSelfClient = (params: HttpSelfClientParams): HttpSelfService => ({
  asScoped: (request) => new InternalHttpSelfScopedClient(params, request),
});

class InternalHttpSelfScopedClient implements HttpSelfScopedClient {
  constructor(
    private readonly params: HttpSelfClientParams,
    private readonly request: KibanaRequest
  ) {}

  public async fetch<TResponseBody = unknown, TRequestBody = unknown>(
    path: string,
    options: HttpSelfFetchOptions<TRequestBody> = {}
  ): Promise<TResponseBody | HttpSelfResponse<TResponseBody, TRequestBody>> {
    validateFetchArguments(path, options);

    const fetchOptions = { ...options, path };
    const request = this.createRequest(path, options);
    const cleanup: Array<() => void> = [];

    try {
      const signal = this.createSignal(options, cleanup);
      const response = await fetch(request, { signal });

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
    const pathname = options.prependBasePath === false ? path : `${this.request.basePath}${path}`;
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

    headers.set(KIBANA_VERSION_HEADER, this.params.kibanaVersion);
    headers.set(SELF_CALL_HEADER, 'true');
    headers.set('user-agent', `KibanaSelfHttpClient/${this.params.kibanaVersion}`);

    const currentDepth = parseDepth(this.request.headers[SELF_CALL_DEPTH_HEADER]);
    if (currentDepth >= MAX_SELF_CALL_DEPTH) {
      throw new Error(
        `Refusing Kibana self HTTP call because maximum depth ${MAX_SELF_CALL_DEPTH} was reached.`
      );
    }
    headers.set(SELF_CALL_DEPTH_HEADER, String(currentDepth + 1));

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

const parseDepth = (value: string | string[] | undefined): number => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const depth = Number(rawValue ?? 0);
  return Number.isFinite(depth) && depth > 0 ? Math.floor(depth) : 0;
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
    lowerName === SELF_CALL_DEPTH_HEADER ||
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
