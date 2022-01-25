/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Url from 'url';
import Https from 'https';

import got, { Agents } from 'got';
import { ToolingLog, isAxiosRequestError, isAxiosResponseError } from '@kbn/dev-utils';

const isConcliftOnGetError = (error: any) => {
  return (
    isAxiosResponseError(error) && error.config.method === 'GET' && error.response.status === 409
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
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, any> | string;
  retries?: number;
  headers?: Record<string, string>;
  ignoreErrors?: number[];
  responseType?: 'text' | 'json' | 'buffer';
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
  private readonly httpsAgent: Https.Agent | undefined;
  private ca?: Buffer[];

  constructor(private readonly log: ToolingLog, options: Options) {
    this.url = options.url;
    this.ca = options.certificateAuthorities;
    this.httpsAgent =
      Url.parse(options.url).protocol === 'https:'
        ? new Https.Agent({
            ca: options.certificateAuthorities,
          })
        : undefined;
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

  async request<T>(options: ReqOptions): Promise<{ data: T; status: number; statusText?: string }> {
    const url = this.resolveUrl(options.path);
    const description = options.description || `${options.method} ${url}`;
    let attempt = 0;
    const maxAttempts = options.retries ?? DEFAULT_MAX_ATTEMPTS;
    const agents: Agents = {
      https: this.httpsAgent,
    };
    while (true) {
      attempt += 1;

      try {
        const response = await got({
          // TODO make configurable
          http2: true,
          https: {
            certificateAuthority: this.ca,
          },
          method: options.method,
          url,
          searchParams: options.query,
          headers: {
            ...options.headers,
            'kbn-xsrf': 'kbn-client',
          },
          body: typeof options.body === 'object' ? JSON.stringify(options.body) : options.body,
          agent: agents,
          responseType: options.responseType,
        });

        return {
          data: response.body as T,
          status: response.statusCode,
          statusText: response.statusMessage,
        };
      } catch (error) {
        const conflictOnGet = isConcliftOnGetError(error);
        const requestedRetries = options.retries !== undefined;
        const failedToGetResponse = isAxiosRequestError(error);

        if (isIgnorableError(error, options.ignoreErrors)) {
          return error.response;
        }

        let errorMessage;
        if (conflictOnGet) {
          errorMessage = `Conflict on GET (path=${options.path}, attempt=${attempt}/${maxAttempts})`;
          this.log.error(errorMessage);
        } else if (requestedRetries || failedToGetResponse) {
          errorMessage = `[${description}] request failed (attempt=${attempt}/${maxAttempts}): ${error.message}`;
          this.log.error(errorMessage);
        } else {
          throw error;
        }

        if (attempt < maxAttempts) {
          await delay(1000 * attempt);
          continue;
        }

        throw new Error(`${errorMessage} -- and ran out of retries`);
      }
    }
  }
}
