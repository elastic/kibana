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

import { Agent } from 'undici';
import type { ToolingLog } from '@kbn/tooling-log';
import { KbnClientRequesterError } from './kbn_client_requester_error';

export interface KbnClientResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

const headersToRecord = (headers: Headers): Record<string, string> => {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
};

const isResponseError = (
  error: any
): error is { response: KbnClientResponse; config?: { method: string; url: string } } => {
  return error && error.response && error.response.status !== undefined;
};

const isRequestError = (error: any): boolean => {
  return error && error.config && error.response === undefined;
};

const isConflictOnGetError = (error: any) => {
  return isResponseError(error) && error.config?.method === 'GET' && error.response.status === 409;
};

const isIgnorableError = (error: any, ignorableErrors: number[] = []) => {
  return isResponseError(error) && ignorableErrors.includes(error.response.status);
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

export type KbnClientResponseType = 'json' | 'text' | 'blob' | 'stream' | 'arraybuffer';

export interface ReqOptions {
  description?: string;
  path: string;
  query?: Record<string, any>;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  retries?: number;
  headers?: Record<string, string>;
  ignoreErrors?: number[];
  responseType?: KbnClientResponseType;
  signal?: AbortSignal;
}

const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

interface Options {
  url: string;
  certificateAuthorities?: Buffer[];
}

export class KbnClientRequester {
  private readonly url: string;
  private readonly dispatcher: Agent | null;

  constructor(private readonly log: ToolingLog, options: Options) {
    this.url = options.url;
    this.dispatcher =
      Url.parse(options.url).protocol === 'https:'
        ? new Agent({
            connect: {
              ca: options.certificateAuthorities?.map((buf) => buf.toString()),
              rejectUnauthorized: false,
            },
          })
        : null;
  }

  private pickUrl() {
    return this.url;
  }

  public resolveUrl(relativeUrl: string = '/') {
    let baseUrl = this.pickUrl();
    if (!baseUrl.endsWith('/')) {
      baseUrl += '/';
    }
    const relative = relativeUrl.startsWith('/') ? relativeUrl.slice(1) : relativeUrl;
    return Url.resolve(baseUrl, relative);
  }

  async request<T>(options: ReqOptions): Promise<KbnClientResponse<T>> {
    const url = this.resolveUrl(options.path);
    const redacted = redactUrl(url);
    let attempt = 0;
    const maxAttempts = options.retries ?? DEFAULT_MAX_ATTEMPTS;
    const msgOrThrow = errMsg({
      redacted,
      maxAttempts,
      requestedRetries: options.retries !== undefined,
      failedToGetResponseSvc: (error: Error) => isRequestError(error),
      ...options,
    });

    while (true) {
      attempt += 1;
      try {
        this.log.debug(`Requesting url (redacted): [${redacted}]`);
        const { fetchUrl, init } = buildRequest(url, this.dispatcher, options);
        const response = await fetch(fetchUrl, init as RequestInit);

        if (!response.ok) {
          const responseData = await parseResponseBody(response, options.responseType);
          const error: any = new Error(
            `Request failed with status ${response.status}: ${response.statusText}`
          );
          error.response = {
            data: responseData,
            status: response.status,
            statusText: response.statusText,
            headers: headersToRecord(response.headers),
          };
          error.config = { method: options.method, url };
          throw error;
        }

        const data = await parseResponseBody<T>(response, options.responseType);
        return {
          data,
          status: response.status,
          statusText: response.statusText,
          headers: headersToRecord(response.headers),
        };
      } catch (error) {
        const statusCode = isResponseError(error) ? error.response.status : 'N/A';
        const errorCause = (error as any).code || (error as Error).message || 'Unknown error';
        const responseBody = isResponseError(error)
          ? JSON.stringify(error.response.data, null, 2)
          : 'No response body';
        const errorDetails = `Status: ${statusCode}, Cause: ${errorCause}, Response: ${responseBody}`;

        this.log.debug(`Request failed - ${errorDetails}, Attempt: ${attempt}/${maxAttempts}`);

        if (isIgnorableError(error, options.ignoreErrors)) return (error as any).response;
        if (attempt < maxAttempts) {
          await delay(1000 * attempt);
          continue;
        }
        throw new KbnClientRequesterError(
          `${msgOrThrow(attempt, error)} -- ${errorDetails} -- and ran out of retries`,
          error
        );
      }
    }
  }
}

async function parseResponseBody<T>(
  response: Response,
  responseType?: KbnClientResponseType
): Promise<T> {
  if (responseType === 'text') {
    return (await response.text()) as unknown as T;
  }
  if (responseType === 'blob') {
    return (await response.blob()) as unknown as T;
  }
  if (responseType === 'arraybuffer') {
    return (await response.arrayBuffer()) as unknown as T;
  }
  if (responseType === 'stream') {
    return response.body as unknown as T;
  }
  // Default: parse as JSON, fall back to text if it fails
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
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
    const result = isConflictOnGetError(_)
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

export function buildRequest(
  url: string,
  dispatcher: Agent | null,
  { method, body, query, headers, responseType, signal }: ReqOptions
): { fetchUrl: string; init: RequestInit & { dispatcher?: Agent } } {
  const queryString = query ? Qs.stringify(query) : '';
  const fetchUrl = queryString ? `${url}?${queryString}` : url;

  let processedBody: any;
  if (body !== undefined) {
    // FormData instances (from form-data package) should be passed through directly
    if (typeof body === 'object' && typeof body.getBuffer === 'function') {
      processedBody = body.getBuffer();
    } else if (typeof body === 'string') {
      processedBody = body;
    } else {
      processedBody = JSON.stringify(body);
    }
  }

  const mergedHeaders: Record<string, string> = {
    ...headers,
    'kbn-xsrf': 'kbn-client',
    'x-elastic-internal-origin': 'kbn-client',
  };

  // If the body is JSON and no content-type is set, add it
  if (
    body !== undefined &&
    typeof body === 'object' &&
    typeof body.getBuffer !== 'function' &&
    !mergedHeaders['content-type'] &&
    !mergedHeaders['Content-Type']
  ) {
    mergedHeaders['content-type'] = 'application/json';
  }

  const init: RequestInit & { dispatcher?: Agent } = {
    method,
    headers: mergedHeaders,
    body: processedBody,
    redirect: 'manual',
    signal,
  };

  if (dispatcher) {
    init.dispatcher = dispatcher;
  }

  return { fetchUrl, init };
}
