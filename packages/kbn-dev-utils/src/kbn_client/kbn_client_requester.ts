/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Url from 'url';

import Axios from 'axios';

import { isAxiosRequestError, isConcliftOnGetError } from './errors';
import { ToolingLog } from '../tooling_log';

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

const MAX_ATTEMPTS = 5;

export interface ReqOptions {
  description?: string;
  path: string;
  query?: Record<string, any>;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  attempt?: number;
}

const delay = (ms: number) =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });

export class KbnClientRequester {
  constructor(private readonly log: ToolingLog, private readonly kibanaUrls: string[]) {}

  private pickUrl() {
    const url = this.kibanaUrls.shift()!;
    this.kibanaUrls.push(url);
    return url;
  }

  public resolveUrl(relativeUrl: string = '/') {
    return Url.resolve(this.pickUrl(), relativeUrl);
  }

  async request<T>(options: ReqOptions): Promise<T> {
    const url = Url.resolve(this.pickUrl(), options.path);
    const description = options.description || `${options.method} ${url}`;
    const attempt = options.attempt === undefined ? 1 : options.attempt;

    try {
      const response = await Axios.request<T>({
        method: options.method,
        url,
        data: options.body,
        params: options.query,
        headers: {
          'kbn-xsrf': 'kbn-client',
        },
      });

      return response.data;
    } catch (error) {
      let retryErrorMsg: string | undefined;
      if (isAxiosRequestError(error)) {
        retryErrorMsg = `[${description}] request failed (attempt=${attempt})`;
      } else if (isConcliftOnGetError(error)) {
        retryErrorMsg = `Conflict on GET (path=${options.path}, attempt=${attempt})`;
      }

      if (retryErrorMsg) {
        if (attempt < MAX_ATTEMPTS) {
          this.log.error(retryErrorMsg);
          await delay(1000 * attempt);
          return await this.request<T>({
            ...options,
            attempt: attempt + 1,
          });
        }

        throw new Error(retryErrorMsg + ' and ran out of retries');
      }

      throw error;
    }
  }
}
