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

import Axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import parseLinkHeader from 'parse-link-header';
import { ToolingLog } from '@kbn/dev-utils';

const ISSUES_URL = '/repos/elastic/kibana/issues/';

export interface GithubIssue {
  html_url: string;
  number: number;
  title: string;
  labels: unknown[];
  body: string;
}

export class GithubApi {
  private readonly x: AxiosInstance;

  constructor(private readonly log: ToolingLog, private readonly token: string | undefined) {
    this.x = Axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        ...(token !== undefined ? { Authentication: `token ${token}` } : {}),
        'User-Agent': 'elastic/kibana#failed_test_reporter',
      },
    });
  }

  async getKibanaIssues() {
    const issues: GithubIssue[] = [];
    const queue = [ISSUES_URL];

    while (queue.length) {
      const url = queue.shift()!;

      const resp = await this.request<GithubIssue[]>({ method: 'GET', url }, []);
      for (const issue of resp.data) {
        issues.push(issue);
      }

      const parsed = parseLinkHeader(resp.headers.link);
      if (parsed && parsed.next && parsed.next.url) {
        queue.push(parsed.next.url);
      }
    }

    return issues;
  }

  async editIssueBody(issueNumber: number, newBody: string) {
    await this.request(
      {
        method: 'PATCH',
        url: Url.resolve(ISSUES_URL, encodeURIComponent(issueNumber)),
        data: {
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
        url: Url.resolve(ISSUES_URL, `${encodeURIComponent(issueNumber)}/comments`),
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
        url: ISSUES_URL,
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

  private async request<T>(options: AxiosRequestConfig, dryRunResponse: T) {
    if (this.token === undefined) {
      this.log.debug(
        `Github API: ${options.method} ${options.url} ${JSON.stringify(options.data)}`
      );
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: dryRunResponse,
      };
    }

    return await this.x.request<T>(options);
  }
}
