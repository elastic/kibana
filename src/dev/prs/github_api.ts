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

import axios, { AxiosError, AxiosResponse } from 'axios';

import { createFailError } from '../run';

interface ResponseError extends AxiosError {
  request: any;
  response: AxiosResponse;
}
const isResponseError = (error: any): error is ResponseError =>
  error && error.response && error.response.status;

const isRateLimitError = (error: any) =>
  isResponseError(error) &&
  error.response.status === 403 &&
  `${error.response.headers['X-RateLimit-Remaining']}` === '0';

export class GithubApi {
  private api = axios.create({
    baseURL: 'https://api.github.com/',
    headers: {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'kibana/update_prs_cli',
      ...(this.accessToken ? { Authorization: `token ${this.accessToken} ` } : {}),
    },
  });

  constructor(private accessToken?: string) {}

  async getPrInfo(prNumber: number) {
    try {
      const resp = await this.api.get(`repos/elastic/kibana/pulls/${prNumber}`);
      const targetRef: string = resp.data.base && resp.data.base.ref;
      if (!targetRef) {
        throw new Error('unable to read base ref from pr info');
      }

      const owner: string = resp.data.head && resp.data.head.user && resp.data.head.user.login;
      if (!owner) {
        throw new Error('unable to read owner info from pr info');
      }

      const sourceBranch: string = resp.data.head.ref;
      if (!sourceBranch) {
        throw new Error('unable to read source branch name from pr info');
      }

      return {
        targetRef,
        owner,
        sourceBranch,
      };
    } catch (error) {
      if (!isRateLimitError(error)) {
        throw error;
      }

      throw createFailError(
        'github rate limit exceeded, please specify the `--access-token` command line flag and try again'
      );
    }
  }
}
