/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Url from 'url';
import Qs from 'querystring';
import { Readable } from 'stream';

import { Agent, type Dispatcher } from 'undici';
import type { ToolingLog } from '@kbn/tooling-log';
import { KbnClientRequesterError } from './kbn_client_requester_error';

/**
 * Type of the response body expected from the server, which determines how the body is parsed and returned. Mirrors the
 * accepted `responseType` values from axios, but adapted to the native fetch API's parsing methods.
 */
export type ResponseType = 'arraybuffer' | 'blob' | 'document' | 'json' | 'text' | 'stream';

/**
 * Envelope returned by `KbnClientRequester.request()`. Mirrors the subset of
 * `AxiosResponse<T>` that callers in this package consumed (`.data`, `.status`,
 * `.headers`, `.statusText`) so existing call sites that destructure
 * `const { data } = ...` keep working.
 */
export interface KbnClientResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
}

const isConflictOnGetError = (error: unknown, method: string) => {
  return error instanceof KbnClientRequesterError && error.status === 409 && method === 'GET';
};

/**
 * Creates a template literal tag which will uriencode the variables in a template literal
 * as well as prefix the path with a specific space if one is defined
 */
export const pathWithSpace = (space?: string) => {
  const prefix = !space || space === 'default' ? '' : uriencode`/s/${space}`;

  return (strings: TemplateStringsArray, ...args: Array<string | number>) => {
    const path = uriencode(strings, ...args);
    return path.startsWith('/') || path === '' ? `${prefix}${path}` : `${prefix}/${path}`;
  };
};

export const uriencode = (
  strings: TemplateStringsArray,
  ...values: Array<string | number | boolean>
) => {
  const queue = strings.slice();

  if (queue.length === 0) {
    throw new Error('how could strings passed to `uriencode` template tag be empty?');
  }

  if (queue.length !== values.length + 1) {
    throw new Error('strings and values passed to `uriencode` template tag are unbalanced');
  }

  // pull the first string off the queue, there is one less item in `values`
  // since the values are always wrapped in strings, so we shift the extra string
  // off the queue to balance the queue and values array.
  const leadingString = queue.shift()!;
  return queue.reduce(
    (acc, string, i) => `${acc}${encodeURIComponent(values[i])}${string}`,
    leadingString
  );
};

const DEFAULT_MAX_ATTEMPTS = 5;

export interface ReqOptions {
  description?: string;
  path: string;
  query?: Record<string, any>;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  retries?: number;
  headers?: Record<string, string>;
  ignoreErrors?: number[];
  responseType?: ResponseType;
  signal?: AbortSignal;
}

const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Whether `body` should be JSON.stringify'd before being sent. Returns `false` for body types fetch
 * knows how to serialize itself (strings, buffers, Node/Web streams, FormData, Blob, URLSearchParams).
 */
const isJsonShapedBody = (body: unknown): boolean => {
  return !(
    body === null ||
    typeof body !== 'object' ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body) ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof URLSearchParams ||
    body instanceof Readable ||
    body instanceof ReadableStream
  );
};

interface Options {
  url: string;
  certificateAuthorities?: Buffer[];
}

export class KbnClientRequester {
  // `url` retains any `user:pass@` from the original config - `resolveUrl()` is
  // a public API used by FTR tests (e.g. http connector tests) that pluck
  // credentials out of it. The stripped version below is only for fetch().
  private readonly url: string;
  private readonly urlForFetch: string;
  private readonly authorization?: string;
  private readonly dispatcher: Dispatcher | null;

  constructor(private readonly log: ToolingLog, options: Options) {
    this.url = options.url;

    // Unlike high-level HTTP clients such as axios, the native fetch rejects URLs that carry
    // `user:pass@host` credentials, so we strip them here and translate to a Basic auth header
    // that's applied to every outgoing request.
    const parsed = new URL(options.url);
    if (parsed.username || parsed.password) {
      this.authorization = `Basic ${Buffer.from(
        `${decodeURIComponent(parsed.username)}:${decodeURIComponent(parsed.password)}`
      ).toString('base64')}`;
      parsed.username = '';
      parsed.password = '';
    }
    this.urlForFetch = parsed.toString();

    this.dispatcher =
      parsed.protocol === 'https:'
        ? new Agent({ connect: { ca: options.certificateAuthorities, rejectUnauthorized: false } })
        : null;
  }

  public resolveUrl(relativeUrl = '/') {
    return this.resolveUrlInternal(this.url, relativeUrl);
  }

  private resolveUrlInternal(baseUrl: string, relativeUrl = '/') {
    return Url.resolve(
      baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`,
      relativeUrl.startsWith('/') ? relativeUrl.slice(1) : relativeUrl
    );
  }

  async request<T>(options: ReqOptions): Promise<KbnClientResponse<T>> {
    const url = this.resolveUrlInternal(this.urlForFetch, options.path);
    const queryString = options.query ? `?${Qs.stringify(options.query)}` : '';
    const fullUrl = url + queryString;
    let attempt = 0;
    const maxAttempts = options.retries ?? DEFAULT_MAX_ATTEMPTS;
    const msgOrThrow = errMsg({
      redacted: url,
      maxAttempts,
      requestedRetries: options.retries !== undefined,
      // Network-level errors (DNS, connection refused, etc.) surface as TypeError from fetch.
      failedToGetResponseSvc: (error: Error) => error instanceof TypeError,
      ...options,
    });

    while (true) {
      attempt += 1;
      try {
        this.log.debug(`Requesting url (redacted): [${url}]`);

        // Unlike high-level HTTP clients such as axios, the native fetch doesn't pick a
        // serialization strategy automatically, and we should do this manually: plain objects
        // will become JSON, `form-data` streams will go through as multipart with the right
        // boundary, strings will stay as is.
        const isJsonBody = isJsonShapedBody(options.body);
        const hasExplicitContentType =
          options.headers !== undefined &&
          Object.keys(options.headers).some((k) => k.toLowerCase() === 'content-type');

        const headers = {
          ...(this.authorization ? { Authorization: this.authorization } : {}),
          ...options.headers,
          'kbn-xsrf': 'kbn-client',
          'x-elastic-internal-origin': 'kbn-client',
          ...(isJsonBody && !hasExplicitContentType ? { 'content-type': 'application/json' } : {}),
        };

        const body =
          options.body === undefined
            ? undefined
            : isJsonBody
            ? JSON.stringify(options.body)
            : (options.body as BodyInit);

        const response = await fetch(fullUrl, {
          method: options.method,
          headers,
          body,
          signal: options.signal,
          ...(this.dispatcher ? { dispatcher: this.dispatcher } : {}),
        } as RequestInit);

        if (!response.ok) {
          if (options.ignoreErrors?.includes(response.status)) {
            // Caller asked us to silently swallow this status (e.g. 404 on delete). Preserve the
            // current contract so callers that destructure `.data` keep working.
            return {
              data: await readBody<T>(response, options.responseType),
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
            };
          }

          throw new KbnClientRequesterError(
            `[${options.method} ${url}] ${response.status} ${
              response.statusText
            } -- ${await response.text()}`,
            { status: response.status, headers: response.headers }
          );
        }

        return {
          data: await readBody<T>(response, options.responseType),
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        };
      } catch (error) {
        const errorStatus =
          error instanceof KbnClientRequesterError && error.status !== undefined
            ? error.status
            : 'N/A';
        const errorCause =
          (error as { code?: string }).code || (error as Error).message || 'Unknown error';
        const errorDetails = `Status: ${errorStatus}, Cause: ${errorCause}`;

        this.log.debug(`Request failed - ${errorDetails}, Attempt: ${attempt}/${maxAttempts}`);

        if (attempt < maxAttempts) {
          await delay(1000 * attempt);
          continue;
        }

        throw new KbnClientRequesterError(
          `${msgOrThrow(attempt, error)} -- ${errorDetails} -- and ran out of retries`,
          {
            status: error instanceof KbnClientRequesterError ? error.status : undefined,
            headers: error instanceof KbnClientRequesterError ? error.headers : undefined,
            cause: error,
          }
        );
      }
    }
  }
}

async function readBody<T>(response: Response, responseType: ResponseType | undefined): Promise<T> {
  switch (responseType) {
    case 'text':
      return (await response.text()) as unknown as T;
    case 'arraybuffer':
      return (await response.arrayBuffer()) as unknown as T;
    case 'blob':
      return (await response.blob()) as unknown as T;
    case 'stream':
      return response.body as unknown as T;
    default:
      // Default 'json' (and undefined), matches axios's auto-JSON-parse, but tolerate empty bodies
      // as some endpoints return 200 with no content.
      const text = await response.text();
      try {
        return JSON.parse(text) as T;
      } catch {
        return text as unknown as T;
      }
  }
}

export function errMsg({
  redacted,
  requestedRetries,
  maxAttempts,
  failedToGetResponseSvc,
  path,
  method,
  description,
}: ReqOptions & {
  redacted: string;
  maxAttempts: number;
  requestedRetries: boolean;
  failedToGetResponseSvc: (x: Error) => boolean;
}) {
  return function errMsgOrReThrow(attempt: number, _: any) {
    const result = isConflictOnGetError(_, method)
      ? `Conflict on GET (path=${path}, attempt=${attempt}/${maxAttempts})`
      : requestedRetries || failedToGetResponseSvc(_)
      ? `[${
          description || `${method} - ${redacted}`
        }] request failed (attempt=${attempt}/${maxAttempts}): ${_?.code}`
      : '';
    if (result === '') throw _;
    return result;
  };
}

export function redactUrl(_: string): string {
  const url = new URL(_);
  return url.password ? `${url.protocol}//${url.host}${url.pathname}` : _;
}
