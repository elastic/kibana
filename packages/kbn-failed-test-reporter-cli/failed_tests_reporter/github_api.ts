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

interface RequestOptions {
  method?: string;
  url?: string;
  data?: unknown;
  safeForDryRun?: boolean;
  maxAttempts?: number;
  attempt?: number;
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
      'Content-Type': 'application/json',
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
    headers: Record<string, string>;
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
        const resp = await fetch(options.url!, {
          method: options.method || 'GET',
          headers: this.defaultHeaders,
          body: options.data ? JSON.stringify(options.data) : undefined,
        });

        if (!resp.ok) {
          const respBody = await resp.text().catch(() => '');
          let parsedBody: unknown;
          try {
            parsedBody = JSON.parse(respBody);
          } catch {
            parsedBody = respBody;
          }

          const error = new Error(
            `[${options.method} ${options.url}] ${resp.status} ${resp.statusText} Error`
          );
          (error as any).response = {
            status: resp.status,
            statusText: resp.statusText,
            data: parsedBody,
          };
          (error as any).config = { method: options.method, url: options.url };
          throw error;
        }

        const data = (await resp.json()) as T;
        const responseHeaders: Record<string, string> = {};
        resp.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        return {
          status: resp.status,
          statusText: resp.statusText,
          headers: responseHeaders,
          data,
        };
      } catch (error) {
        const hasResponse = !!(error as any)?.response;
        const isServerError = hasResponse && (error as any).response.status >= 500;
        const isNetworkError = !hasResponse;
        const errorResponseLog = hasResponse
          ? `[${options.method} ${options.url}] ${(error as any).response.status} ${
              (error as any).response.statusText
            } Error`
          : undefined;

        if ((isNetworkError || isServerError) && attempt < maxAttempts) {
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
          throw new Error(`${errorResponseLog}: ${JSON.stringify((error as any).response.data)}`);
        }

        throw error;
      }
    }
  }
}
