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

import Axios, { AxiosRequestConfig, AxiosInstance } from 'axios';
import parseLinkHeader from 'parse-link-header';
import { ToolingLog, isAxiosResponseError, isAxiosRequestError } from '@kbn/dev-utils';

const BASE_URL = 'https://api.github.com/repos/elastic/kibana/';

export interface GithubIssue {
  html_url: string;
  number: number;
  title: string;
  labels: unknown[];
  body: string;
}

type RequestOptions = AxiosRequestConfig & {
  safeForDryRun?: boolean;
  maxAttempts?: number;
  attempt?: number;
};

export class GithubApi {
  private readonly log: ToolingLog;
  private readonly token: string | undefined;
  private readonly dryRun: boolean;
  private readonly x: AxiosInstance;

  /**
   * Create a GithubApi helper object, if token is undefined requests won't be
   * sent, but will instead be logged.
   */
  constructor(options: {
    log: GithubApi['log'];
    token: GithubApi['token'];
    dryRun: GithubApi['dryRun'];
  }) {
    this.log = options.log;
    this.token = options.token;
    this.dryRun = options.dryRun;

    if (!this.token && !this.dryRun) {
      throw new TypeError('token parameter is required');
    }

    this.x = Axios.create({
      headers: {
        ...(this.token ? { Authorization: `token ${this.token}` } : {}),
        'User-Agent': 'elastic/kibana#failed_test_reporter',
      },
    });
  }

  private failedTestIssuesPageCache: {
    pages: GithubIssue[][];
    nextRequest: RequestOptions | undefined;
  } = {
    pages: [],
    nextRequest: {
      safeForDryRun: true,
      method: 'GET',
      url: Url.resolve(BASE_URL, 'issues'),
      params: {
        state: 'all',
        per_page: '100',
        labels: 'failed-test',
        sort: 'updated',
        direction: 'desc',
      },
    },
  };

  /**
   * Iterate the `failed-test` issues from elastic/kibana, each response
   * from Github is cached and subsequent calls to this method will first
   * iterate the previous responses from Github, then start requesting
   * more pages of issues from github until all pages have been cached.
   *
   * Aborting the iterator part way through will prevent unnecessary request
   * to Github from being issued.
   */
  async *iterateCachedFailedTestIssues() {
    const cache = this.failedTestIssuesPageCache;

    // start from page 0, and progress forward if we have cache or a request that will load that cache page
    for (let page = 0; page < cache.pages.length || cache.nextRequest; page++) {
      if (page >= cache.pages.length && cache.nextRequest) {
        const resp = await this.request<GithubIssue[]>(cache.nextRequest, []);
        cache.pages.push(resp.data);

        const link =
          typeof resp.headers.link === 'string' ? parseLinkHeader(resp.headers.link) : undefined;

        cache.nextRequest =
          link && link.next && link.next.url
            ? {
                safeForDryRun: true,
                method: 'GET',
                url: link.next.url,
              }
            : undefined;
      }

      for (const issue of cache.pages[page]) {
        yield issue;
      }
    }
  }

  async findFailedTestIssue(test: (issue: GithubIssue) => boolean) {
    for await (const issue of this.iterateCachedFailedTestIssues()) {
      if (test(issue)) {
        return issue;
      }
    }
  }

  async editIssueBodyAndEnsureOpen(issueNumber: number, newBody: string) {
    await this.request(
      {
        method: 'PATCH',
        url: Url.resolve(BASE_URL, `issues/${encodeURIComponent(issueNumber)}`),
        data: {
          state: 'open', // Reopen issue if it was closed.
          body: newBody,
        },
      },
      undefined
    );
  }

  async addIssueComment(issueNumber: number, commentBody: string) {
    await this.request(
      {
        method: 'POST',
        url: Url.resolve(BASE_URL, `issues/${encodeURIComponent(issueNumber)}/comments`),
        data: {
          body: commentBody,
        },
      },
      undefined
    );
  }

  async createIssue(title: string, body: string, labels?: string[]) {
    const resp = await this.request(
      {
        method: 'POST',
        url: Url.resolve(BASE_URL, 'issues'),
        data: {
          title,
          body,
          labels,
        },
      },
      {
        html_url: 'https://dryrun',
      }
    );

    return resp.data.html_url;
  }

  private async request<T>(
    options: RequestOptions,
    dryRunResponse: T
  ): Promise<{
    status: number;
    statusText: string;
    headers: Record<string, string | string[] | undefined>;
    data: T;
  }> {
    const executeRequest = !this.dryRun || options.safeForDryRun;
    const maxAttempts = options.maxAttempts || 5;
    const attempt = options.attempt || 1;

    this.log.verbose('Github API', executeRequest ? 'Request' : 'Dry Run', options);

    if (!executeRequest) {
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: dryRunResponse,
      };
    }

    try {
      return await this.x.request<T>(options);
    } catch (error) {
      const unableToReachGithub = isAxiosRequestError(error);
      const githubApiFailed = isAxiosResponseError(error) && error.response.status >= 500;
      const errorResponseLog =
        isAxiosResponseError(error) &&
        `[${error.config.method} ${error.config.url}] ${error.response.status} ${error.response.statusText} Error`;

      if ((unableToReachGithub || githubApiFailed) && attempt < maxAttempts) {
        const waitMs = 1000 * attempt;

        if (errorResponseLog) {
          this.log.error(`${errorResponseLog}: waiting ${waitMs}ms to retry`);
        } else {
          this.log.error(`Unable to reach github, waiting ${waitMs}ms to retry`);
        }

        await new Promise(resolve => setTimeout(resolve, waitMs));
        return await this.request<T>(
          {
            ...options,
            maxAttempts,
            attempt: attempt + 1,
          },
          dryRunResponse
        );
      }

      if (errorResponseLog) {
        throw new Error(`${errorResponseLog}: ${JSON.stringify(error.response.data)}`);
      }

      throw error;
    }
  }
}
