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

import Axios, { AxiosRequestConfig } from 'axios';
import parseLinkHeader from 'parse-link-header';
import { ToolingLog, isAxiosResponseError } from '@kbn/dev-utils';

const BASE_URL = 'https://api.github.com/repos/elastic/kibana/';

export interface GithubIssue {
  html_url: string;
  number: number;
  title: string;
  labels: unknown[];
  body: string;
}

type RequestOptions = AxiosRequestConfig & { safeForDryRun?: boolean };

export class GithubApi {
  private readonly x = Axios.create({
    headers: {
      Authorization: `token ${this.token}`,
      'User-Agent': 'elastic/kibana#failed_test_reporter',
    },
  });

  /**
   * Create a GithubApi helper object, if token is undefined requests won't be
   * sent, but will instead be logged.
   */
  constructor(
    private readonly log: ToolingLog,
    private readonly token: string | undefined,
    private readonly dryRun: boolean
  ) {
    if (!token && !dryRun) {
      throw new TypeError('token parameter is required');
    }
  }

  async getAllFailedTestIssues() {
    this.log.info('Fetching failed-test issues');
    const issues: GithubIssue[] = [];
    let nextRequest: RequestOptions = {
      safeForDryRun: true,
      method: 'GET',
      url: Url.resolve(BASE_URL, 'issues'),
      params: {
        state: 'all',
        per_page: '100',
        labels: 'failed-test',
      },
    };

    while (true) {
      const resp = await this.request<GithubIssue[]>(nextRequest, []);

      for (const issue of resp.data) {
        issues.push(issue);
      }

      const parsed = parseLinkHeader(resp.headers.link);
      if (parsed && parsed.next && parsed.next.url) {
        nextRequest = {
          safeForDryRun: true,
          method: 'GET',
          url: parsed.next.url,
        };
      } else {
        break;
      }
    }

    return issues;
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

  private async request<T>(options: RequestOptions, dryRunResponse: T) {
    const executeRequest = !this.dryRun || options.safeForDryRun;
    this.log.verbose('Github API', executeRequest ? 'Request' : 'Dry Run', options);

    if (executeRequest) {
      try {
        return await this.x.request<T>(options);
      } catch (error) {
        if (isAxiosResponseError(error)) {
          throw new Error(
            `[${error.config.method} ${error.config.url}] ${error.response.status} ${
              error.response.statusText
            } Error: ${JSON.stringify(error.response.data)}`
          );
        }

        throw error;
      }
    }

    return {
      status: 200,
      statusText: 'OK',
      headers: {},
      data: dryRunResponse,
    };
  }
}
