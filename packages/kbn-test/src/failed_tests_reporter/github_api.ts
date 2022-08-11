/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Url from 'url';

import Axios, { AxiosRequestConfig, AxiosInstance } from 'axios';
import { isAxiosResponseError, isAxiosRequestError } from '@kbn/dev-utils';
import { ToolingLog } from '@kbn/tooling-log';

const BASE_URL = 'https://api.github.com/repos/elastic/kibana/';

export interface GithubIssue {
  html_url: string;
  number: number;
  node_id: string;
  title: string;
  labels: unknown[];
  body: string;
}

/**
 * Minimal GithubIssue type that can be easily replicated by dry-run helpers
 */
export interface GithubIssueMini {
  number: GithubIssue['number'];
  body: GithubIssue['body'];
  html_url: GithubIssue['html_url'];
  node_id: GithubIssue['node_id'];
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
  private requestCount: number = 0;

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

  getRequestCount() {
    return this.requestCount;
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
    const resp = await this.request<GithubIssueMini>(
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
        body,
        number: 999,
        html_url: 'https://dryrun',
        node_id: 'adflksdjf',
      }
    );

    return resp.data;
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

    let attempt = 0;
    while (true) {
      attempt += 1;
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
        this.requestCount += 1;
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

          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }

        if (errorResponseLog) {
          throw new Error(`${errorResponseLog}: ${JSON.stringify(error.response.data)}`);
        }

        throw error;
      }
    }
  }
}
