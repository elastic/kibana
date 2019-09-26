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

import Axios, { AxiosError, AxiosResponse } from 'axios';
import { ToolingLog } from '../tooling_log';

interface AxiosRequestError extends AxiosError {
  response: undefined;
}

interface AxiosResponseError<T> extends AxiosError {
  response: AxiosResponse<T>;
}

const delay = (ms: number) =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });

const isAxiosRequestError = (error: any): error is AxiosRequestError => {
  return error && error.code === undefined && error.response === undefined;
};

const isAxiosResponseError = (error: any): error is AxiosResponseError<any> => {
  return error && error.code !== undefined && error.response !== undefined;
};

const isConcliftOnGetError = (error: any) => {
  return (
    isAxiosResponseError(error) && error.config.method === 'GET' && error.response.status === 409
  );
};

const PLUGIN_STATUS_ID = /^plugin:(.+?)@/;
const MAX_ATTEMPTS = 5;

interface ReqOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: any;
  attempt?: number;
}

interface Status {
  state: 'green' | 'red' | 'yellow';
  title?: string;
  id?: string;
  icon: string;
  message: string;
  uiColor: string;
  since: string;
}

interface ApiResponseStatus {
  name: string;
  uuid: string;
  version: {
    number: string;
    build_hash: string;
    build_number: number;
    build_snapshot: boolean;
  };
  status: {
    overall: Status;
    statuses: Status[];
  };
  metrics: unknown;
}

export class KbnClient {
  /**
   * Basic Kibana server client that implements common behaviors for talking
   * to the Kibana server from dev tooling.
   *
   * @param log ToolingLog
   * @param kibanaUrls Array of kibana server urls to send requests to
   */
  constructor(private readonly log: ToolingLog, private readonly kibanaUrls: string[]) {
    if (!this.kibanaUrls.length) {
      throw new Error('missing Kibana urls');
    }
  }

  /**
   * Get the current server status
   */
  public async getStatus() {
    return await this.request<ApiResponseStatus>({
      method: 'GET',
      path: 'api/status',
    });
  }

  /**
   * Get a list of plugin ids that are enabled on the server
   */
  public async getEnabledPluginIds() {
    const pluginIds: string[] = [];
    const apiResp = await this.getStatus();

    for (const status of apiResp.status.statuses) {
      if (status.id) {
        const match = status.id.match(PLUGIN_STATUS_ID);
        if (match) {
          pluginIds.push(match[1]);
        }
      }
    }

    return pluginIds;
  }

  private pickUrl() {
    const url = this.kibanaUrls.shift()!;
    this.kibanaUrls.push(url);
    return url;
  }

  private async request<T>(options: ReqOptions): Promise<T> {
    const url = Url.resolve(this.pickUrl(), options.path);
    const attempt = options.attempt === undefined ? 1 : options.attempt;

    try {
      const response = await Axios.request<T>({
        method: options.method,
        url,
        data: options.body,
        headers: {
          'kbn-xsrf': 'kbn-client',
        },
      });

      return response.data;
    } catch (error) {
      let retryWarning: string | undefined;
      if (isAxiosRequestError(error)) {
        retryWarning = `${options.method} ${url} request failed to get a response (attempt=${attempt})`;
      } else if (isConcliftOnGetError(error)) {
        retryWarning = `Conflict on GET (path=${options.path}, attempt=${attempt})`;
      }

      if (retryWarning) {
        if (attempt < MAX_ATTEMPTS) {
          this.log.warning(retryWarning);
          await delay(1000 * attempt);
          return await this.request<T>({
            ...options,
            attempt: attempt + 1,
          });
        }

        throw new Error(retryWarning + ' and ran out of retries');
      }

      throw error;
    }
  }
}
