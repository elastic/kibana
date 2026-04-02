/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createFailError } from '@kbn/dev-cli-errors';

interface ResponseError extends Error {
  status: number;
  headers: Headers;
}
const isResponseError = (error: any): error is ResponseError =>
  error && typeof error.status === 'number';

const isRateLimitError = (error: any) =>
  isResponseError(error) &&
  error.status === 403 &&
  `${error.headers.get('X-RateLimit-Remaining')}` === '0';

export class GithubApi {
  private baseURL = 'https://api.github.com/';
  private defaultHeaders: Record<string, string>;

  constructor(private accessToken?: string) {
    this.defaultHeaders = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'kibana/update_prs_cli',
      ...(this.accessToken ? { Authorization: `token ${this.accessToken} ` } : {}),
    };
  }

  private async request(path: string): Promise<any> {
    const url = `${this.baseURL}${path}`;
    const response = await fetch(url, { headers: this.defaultHeaders });
    if (!response.ok) {
      const err = new Error(`Request failed with status ${response.status}`) as any;
      err.status = response.status;
      err.headers = response.headers;
      throw err;
    }
    return response.json();
  }

  async getPrInfo(prNumber: number) {
    try {
      const data = await this.request(`repos/elastic/kibana/pulls/${prNumber}`);
      const targetRef: string = data.base && data.base.ref;
      if (!targetRef) {
        throw new Error('unable to read base ref from pr info');
      }

      const owner: string = data.head && data.head.user && data.head.user.login;
      if (!owner) {
        throw new Error('unable to read owner info from pr info');
      }

      const sourceBranch: string = data.head.ref;
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
