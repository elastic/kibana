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

export const DEFAULT_GITHUB_REPO = 'elastic/kibana';

/** URL of the `rel="next"` entry of a GitHub `Link` response header, if any. */
export function nextPageUrl(linkHeader: string | null): string | undefined {
  if (!linkHeader) {
    return undefined;
  }
  for (const part of linkHeader.split(',')) {
    const match = part.trim().match(/^<([^>]+)>;\s*rel="next"$/);
    if (match) {
      return match[1];
    }
  }
  return undefined;
}

export type GithubIssueState = 'open' | 'closed';

export interface GithubIssue {
  html_url: string;
  number: number;
  node_id: string;
  title: string;
  labels: unknown[];
  body: string;
  state: GithubIssueState;
}

export interface ListIssuesOptions {
  /** Only issues carrying every one of these labels. */
  labels: string[];
  state: GithubIssueState | 'all';
  /** Safety valve against unbounded pagination; 100 issues per page. */
  maxPages?: number;
}

export interface SearchIssuesOptions {
  /** Search qualifiers; the repository and `is:issue` are added automatically. */
  query: string;
  /** GitHub caps search results at 1000, i.e. 10 pages of 100. */
  maxPages?: number;
}

interface SearchIssuesResponse {
  total_count: number;
  incomplete_results: boolean;
  items: Array<GithubIssue & { pull_request?: unknown }>;
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
  private readonly repo: string;
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;
  private requestCount: number = 0;

  /**
   * Create a GithubApi helper object, if token is undefined requests won't be
   * sent, but will instead be logged. `repo` (`owner/name`) defaults to elastic/kibana.
   */
  constructor(options: {
    log: GithubApi['log'];
    token: GithubApi['token'];
    dryRun: GithubApi['dryRun'];
    repo?: string;
  }) {
    this.log = options.log;
    this.token = options.token;
    this.dryRun = options.dryRun;
    this.repo = options.repo ?? DEFAULT_GITHUB_REPO;
    this.baseUrl = `https://api.github.com/repos/${this.repo}/`;

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
        url: Url.resolve(this.baseUrl, `issues/${encodeURIComponent(issueNumber)}`),
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
            this.baseUrl,
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

  /**
   * List issues by label, following pagination. Read-only, so it also runs in dry-run mode. Pull
   * requests share the issues endpoint and are filtered out.
   */
  async listIssues({ labels, state, maxPages = 50 }: ListIssuesOptions): Promise<GithubIssue[]> {
    const query = new URLSearchParams({ labels: labels.join(','), state, per_page: '100' });
    return await this.collectIssues({
      firstPageUrl: Url.resolve(this.baseUrl, `issues?${query}`),
      maxPages,
      itemsOf: (page: Array<GithubIssue & { pull_request?: unknown }>) => page,
      emptyPage: [],
      description: `issues labelled ${labels.join(',')}`,
    });
  }

  /**
   * Issues of the repository matching a GitHub search query, most recently updated first.
   * Read-only, so it also runs in dry-run mode. Use it when listing by label would page through
   * far more issues than the query matches; GitHub caps search results at 1000.
   */
  async searchIssues({ query, maxPages = 10 }: SearchIssuesOptions): Promise<GithubIssue[]> {
    const params = new URLSearchParams({
      q: `repo:${this.repo} is:issue ${query}`,
      sort: 'updated',
      order: 'desc',
      per_page: '100',
    });
    return await this.collectIssues({
      firstPageUrl: `https://api.github.com/search/issues?${params}`,
      maxPages,
      itemsOf: (page: SearchIssuesResponse) => {
        if (page.incomplete_results) {
          this.log.warning(`GitHub search timed out for "${query}"; results may be incomplete`);
        }
        return page.items;
      },
      emptyPage: { total_count: 0, incomplete_results: false, items: [] },
      description: `issues matching "${query}"`,
    });
  }

  /** Follows `Link: rel="next"` headers, dropping pull requests (which share the issue shape). */
  private async collectIssues<TPage>(options: {
    firstPageUrl: string;
    maxPages: number;
    itemsOf: (page: TPage) => Array<GithubIssue & { pull_request?: unknown }>;
    emptyPage: TPage;
    description: string;
  }): Promise<GithubIssue[]> {
    const issues: GithubIssue[] = [];
    let url: string | undefined = options.firstPageUrl;

    for (let page = 1; page <= options.maxPages && url; page++) {
      const resp = await this.request<TPage>(
        { method: 'GET', url, safeForDryRun: true },
        options.emptyPage
      );

      for (const issue of options.itemsOf(resp.data)) {
        if (!issue.pull_request) {
          issues.push({ ...issue, body: issue.body ?? '' });
        }
      }

      // Pages can hold fewer items than requested even when more follow, so trust the Link header
      url = nextPageUrl(resp.headers.get('link'));
    }

    if (url) {
      this.log.warning(
        `Stopped listing ${options.description} after ${options.maxPages} pages; results are incomplete`
      );
    }
    return issues;
  }

  async addIssueComment(issueNumber: number, commentBody: string) {
    await this.request(
      {
        method: 'POST',
        url: Url.resolve(this.baseUrl, `issues/${encodeURIComponent(issueNumber)}/comments`),
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
        url: Url.resolve(this.baseUrl, 'issues'),
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
