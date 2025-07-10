/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Url from 'url';
import Https from 'https';
import Qs from 'querystring';

import Axios, { AxiosResponse, ResponseType } from 'axios';
import { isAxiosRequestError, isAxiosResponseError } from '@kbn/dev-utils';
import { ToolingLog } from '@kbn/tooling-log';
import { KbnClientRequesterError } from './kbn_client_requester_error';

const isConcliftOnGetError = (error: any) => {
  return (
    isAxiosResponseError(error) && error.config?.method === 'GET' && error.response.status === 409
  );
};

const isIgnorableError = (error: any, ignorableErrors: number[] = []) => {
  return isAxiosResponseError(error) && ignorableErrors.includes(error.response.status);
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
  private readonly httpsAgent: Https.Agent | null;

  constructor(private readonly log: ToolingLog, options: Options) {
    this.url = options.url;
    this.httpsAgent =
      Url.parse(options.url).protocol === 'https:'
        ? new Https.Agent({
            ca: options.certificateAuthorities,
            rejectUnauthorized: false,
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

  async request<T>(options: ReqOptions): Promise<AxiosResponse<T>> {
    const url = this.resolveUrl(options.path);
    const redacted = redactUrl(url);
    let attempt = 0;
    const maxAttempts = options.retries ?? DEFAULT_MAX_ATTEMPTS;
    const msgOrThrow = errMsg({
      redacted,
      maxAttempts,
      requestedRetries: options.retries !== undefined,
      failedToGetResponseSvc: (error: Error) => isAxiosRequestError(error),
      ...options,
    });

    while (true) {
      attempt += 1;
      try {
        this.log.debug(`Requesting url (redacted): [${redacted}]`);
        return await Axios.request(buildRequest(url, this.httpsAgent, options));
      } catch (error) {
        if (isIgnorableError(error, options.ignoreErrors)) return error.response;
        if (attempt < maxAttempts) {
          await delay(1000 * attempt);
          continue;
        }
        throw new KbnClientRequesterError(
          `${msgOrThrow(attempt, error)} -- and ran out of retries`,
          error
        );
      }
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
    const result = isConcliftOnGetError(_)
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
  url: any,
  httpsAgent: Https.Agent | null,
  { method, body, query, headers, responseType }: any
) {
  return {
    method,
    url,
    data: body,
    params: query,
    headers: {
      ...headers,
      'kbn-xsrf': 'kbn-client',
      'x-elastic-internal-origin': 'kbn-client',
    },
    httpsAgent,
    responseType,
    // work around https://github.com/axios/axios/issues/2791
    transformResponse: responseType === 'text' ? [(x: any) => x] : undefined,
    maxContentLength: 30000000,
    maxBodyLength: 30000000,
    paramsSerializer: (params: any) => Qs.stringify(params),
  };
}
