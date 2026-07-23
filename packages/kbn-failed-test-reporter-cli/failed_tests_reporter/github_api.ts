/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Url from 'url';

import type { ToolingLog } from '@kbn/tooling-log';

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

export interface GithubIssueComment {
  body: string;
}

interface RequestOptions {
  method: string;
  url: string;
  data?: unknown;
  safeForDryRun?: boolean;
  maxAttempts?: number;
}

export class GithubApi {
  private readonly log: ToolingLog;
  private readonly token: string | undefined;
  private readonly dryRun: boolean;
  private readonly defaultHeaders: Record<string, string>;
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

    this.defaultHeaders = {
      ...(this.token ? { Authorization: `token ${this.token}` } : {}),
      'User-Agent': 'elastic/kibana#failed_test_reporter',
    };
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

  /**
   * Fetch all comments on an issue, following pagination. Returns an empty
   * list in dry-run mode so update flows behave sensibly without hitting the
   * (rate limited) GitHub API.
   */
  async getIssueComments(issueNumber: number): Promise<GithubIssueComment[]> {
    const perPage = 100;
    const comments: GithubIssueComment[] = [];

    let page = 1;
    while (true) {
      const resp = await this.request<Array<{ body?: string }>>(
        {
          method: 'GET',
          url: Url.resolve(
            BASE_URL,
            `issues/${encodeURIComponent(issueNumber)}/comments?per_page=${perPage}&page=${page}`
          ),
        },
        []
      );

      for (const comment of resp.data) {
        comments.push({ body: comment.body ?? '' });
      }

      if (resp.data.length < perPage) {
        return comments;
      }

      page += 1;
    }
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
    headers: Headers;
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
          headers: new Headers(),
          data: dryRunResponse,
        };
      }

      this.requestCount += 1;

      let response: Response;
      try {
        response = await fetch(options.url, {
          method: options.method,
          headers: {
            ...this.defaultHeaders,
            ...(options.data !== undefined ? { 'Content-Type': 'application/json' } : {}),
          },
          body: options.data !== undefined ? JSON.stringify(options.data) : undefined,
        });
      } catch (error) {
        // Network-level error (DNS, connection refused, etc.).
        if (attempt < maxAttempts) {
          const waitMs = 1000 * attempt;
          this.log.error(`Unable to reach github, waiting ${waitMs}ms to retry`);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }
        throw error;
      }

      if (!response.ok) {
        const errorResponseLog = `[${options.method} ${options.url}] ${response.status} ${response.statusText} Error`;
        if (response.status >= 500 && attempt < maxAttempts) {
          const waitMs = 1000 * attempt;
          this.log.error(`${errorResponseLog}: waiting ${waitMs}ms to retry`);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }

        throw new Error(`${errorResponseLog}: ${await response.text()}`);
      }

      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: (await response.json()) as T,
      };
    }
  }
}
