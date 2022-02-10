/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import axios, { AxiosError, AxiosResponse, AxiosInstance } from 'axios';

import { createFailError } from '@kbn/dev-utils';

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
  private api: AxiosInstance;

  constructor(private accessToken?: string) {
    this.api = axios.create({
      baseURL: 'https://api.github.com/',
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'kibana/update_prs_cli',
        ...(this.accessToken ? { Authorization: `token ${this.accessToken} ` } : {}),
      },
    });
  }

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
