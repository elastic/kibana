/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Url from 'url';
import Https from 'https';
import Axios, { AxiosResponse } from 'axios';

import { isAxiosRequestError, isAxiosResponseError } from '../axios';
import { ToolingLog } from '../tooling_log';

const isConcliftOnGetError = (error: any) => {
  return (
    isAxiosResponseError(error) && error.config.method === 'GET' && error.response.status === 409
  );
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
  body?: any;
  retries?: number;
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
          })
        : null;
  }

  private pickUrl() {
    return this.url;
  }

  public resolveUrl(relativeUrl: string = '/') {
    return Url.resolve(this.pickUrl(), relativeUrl);
  }

  async request<T>(options: ReqOptions): Promise<AxiosResponse<T>> {
    const url = Url.resolve(this.pickUrl(), options.path);
    const description = options.description || `${options.method} ${url}`;
    let attempt = 0;
    const maxAttempts = options.retries ?? DEFAULT_MAX_ATTEMPTS;

    while (true) {
      attempt += 1;

      try {
        const response = await Axios.request({
          method: options.method,
          url,
          data: options.body,
          params: options.query,
          headers: {
            'kbn-xsrf': 'kbn-client',
          },
          httpsAgent: this.httpsAgent,
        });

        return response;
      } catch (error) {
        const conflictOnGet = isConcliftOnGetError(error);
        const requestedRetries = options.retries !== undefined;
        const failedToGetResponse = isAxiosRequestError(error);

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
