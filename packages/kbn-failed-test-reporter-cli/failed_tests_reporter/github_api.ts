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
  created_at: string;
  closed_at: string | null;
}

export interface ListIssuesOptions {
  state: GithubIssueState | 'all';
  /** Only issues carrying every one of these labels. */
  labels?: string[];
  /** Only issues updated at or after this time. */
  since?: Date;
  sort?: 'created' | 'updated' | 'comments';
  direction?: 'asc' | 'desc';
  /**
   * Pause between pages so a long listing stays clear of GitHub's secondary rate limits, which
   * are shared by every job using the same token.
   */
  pageIntervalMs?: number;
}

/** GitHub caps `per_page` at 100 for issue listings. */
const ISSUES_PER_PAGE = 100;
const DEFAULT_PAGE_INTERVAL_MS = 300;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

export interface GithubIssueEvent {
  id: number;
  event: string;
  created_at: string;
  label?: { name: string };
  body?: string;
  user?: { login: string } | null;
}

export interface GithubFixPullRequest {
  number: number;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  mergedAt: string | null;
}

interface ClosingPullRequestsResponse {
  data?: {
    repository: {
      issue: {
        closedByPullRequestsReferences: {
          nodes: Array<GithubFixPullRequest & { repository: { nameWithOwner: string } }>;
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
      } | null;
    } | null;
  };
  errors?: Array<{ message: string }>;
}

export const hasIssueLabel = (issue: GithubIssue, name: string): boolean =>
  issue.labels.some(
    (label) =>
      label === name ||
      (typeof label === 'object' && label !== null && 'name' in label && label.name === name)
  );

interface RequestOptions {
  method: string;
  url: string;
  data?: unknown;
  safeForDryRun?: boolean;
  maxAttempts?: number;
}

/**
 * Pause before every request that creates or changes content, following GitHub's guidance to
 * keep content-generating requests around one per second so the secondary rate limit, shared by
 * every job using the same token, is never approached.
 */
const WRITE_INTERVAL_MS = 1000;

/** Longest single wait for a rate limit; the fifth secondary-limit retry would otherwise be 16 min. */
const MAX_RATE_LIMIT_WAIT_SECONDS = 5 * 60;

/**
 * Seconds to wait before retrying a rate-limited request, or 0 if the response is not rate
 * limited, following GitHub's guidance: honor `retry-after` when sent, otherwise the primary
 * limit's `x-ratelimit-reset` when `x-ratelimit-remaining` is 0, otherwise, for a secondary
 * limit that sends neither header, wait at least a minute and back off exponentially.
 */
const rateLimitRetryAfterSeconds = (
  status: number,
  headers: Headers,
  body: string,
  attempt: number
): number => {
  if (status !== 403 && status !== 429) {
    return 0;
  }

  const retryAfter = Number(headers.get('retry-after'));
  if (retryAfter > 0) {
    return Math.min(retryAfter, MAX_RATE_LIMIT_WAIT_SECONDS);
  }
  if (headers.get('x-ratelimit-remaining') === '0') {
    const resetAt = Number(headers.get('x-ratelimit-reset')) * 1000;
    const waitSeconds = Math.ceil((resetAt - Date.now()) / 1000) + 1;
    return Number.isFinite(waitSeconds)
      ? Math.min(Math.max(1, waitSeconds), MAX_RATE_LIMIT_WAIT_SECONDS)
      : 60;
  }
  if (/rate limit/i.test(body)) {
    return Math.min(60 * 2 ** (attempt - 1), MAX_RATE_LIMIT_WAIT_SECONDS);
  }
  return 0;
};

export class GithubApi {
  private readonly log: ToolingLog;
  private readonly token: string | undefined;
  private readonly dryRun: boolean;
  private readonly repo: string;
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;
  private requestCount: number = 0;
  private lastWriteAt: number = 0;
  private writeQueue: Promise<void> = Promise.resolve();

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

  async getAuthenticatedLogin(): Promise<string> {
    const { data } = await this.request<{ login: string } | undefined>(
      { method: 'GET', url: 'https://api.github.com/user', safeForDryRun: true },
      undefined
    );
    if (!data?.login) throw new Error('GitHub returned no authenticated user');
    return data.login;
  }

  async getIssue(issueNumber: number): Promise<GithubIssue> {
    const { data } = await this.request<GithubIssue | undefined>(
      { method: 'GET', url: `${this.baseUrl}issues/${issueNumber}`, safeForDryRun: true },
      undefined
    );
    if (!data) throw new Error(`GitHub returned no issue for #${issueNumber}`);
    return { ...data, body: data.body ?? '' };
  }

  async getIssueTimeline(issueNumber: number): Promise<GithubIssueEvent[]> {
    const events: GithubIssueEvent[] = [];
    let url: string | undefined = `${this.baseUrl}issues/${issueNumber}/timeline?per_page=100`;
    while (url) {
      const response = await this.request<GithubIssueEvent[]>(
        { method: 'GET', url, safeForDryRun: true },
        []
      );
      events.push(...response.data);
      url = nextPageUrl(response.headers.get('link'));
      if (url) await sleep(DEFAULT_PAGE_INTERVAL_MS);
    }
    return events;
  }

  /**
   * Pull requests of this repository that GitHub links as closing the issue, by closing keyword
   * or a manual Development link, whatever their state. An ordinary mention is not such a link.
   */
  async getIssueFixPullRequests(issueNumber: number): Promise<GithubFixPullRequest[]> {
    const [owner, name] = this.repo.split('/');
    const pullRequests = new Map<number, GithubFixPullRequest>();
    let after: string | null = null;
    while (true) {
      const response: ClosingPullRequestsResponse = (
        await this.request<ClosingPullRequestsResponse>(
          {
            method: 'POST',
            url: 'https://api.github.com/graphql',
            safeForDryRun: true,
            data: {
              query: `query($owner: String!, $name: String!, $number: Int!, $after: String) {
              repository(owner: $owner, name: $name) {
                issue(number: $number) {
                  closedByPullRequestsReferences(first: 100, after: $after, includeClosedPrs: true) {
                    nodes { number state mergedAt repository { nameWithOwner } }
                    pageInfo { hasNextPage endCursor }
                  }
                }
              }
            }`,
              variables: { owner, name, number: issueNumber, after },
            },
          },
          {}
        )
      ).data;
      const issue = response.data?.repository?.issue;
      if (response.errors?.length || !issue) {
        throw new Error(
          `Unable to read fix PRs of #${issueNumber}: ${
            response.errors?.map(({ message }) => message).join('; ') || 'not found'
          }`
        );
      }
      const { nodes, pageInfo } = issue.closedByPullRequestsReferences;
      for (const { number, state, mergedAt, repository } of nodes) {
        if (repository.nameWithOwner !== this.repo) continue;
        if (!['OPEN', 'CLOSED', 'MERGED'].includes(state) || (state === 'MERGED' && !mergedAt)) {
          throw new Error(`GitHub returned an invalid state for fix PR #${number}`);
        }
        pullRequests.set(number, { number, state, mergedAt });
      }
      if (!pageInfo.hasNextPage) {
        return [...pullRequests.values()];
      }
      if (!pageInfo.endCursor || pageInfo.endCursor === after) {
        throw new Error(`Incomplete fix PR history for #${issueNumber}`);
      }
      after = pageInfo.endCursor;
    }
  }

  async checkLabel(name: string): Promise<void> {
    await this.request(
      {
        method: 'GET',
        url: `${this.baseUrl}labels/${encodeURIComponent(name)}`,
        safeForDryRun: true,
      },
      undefined
    );
  }

  /** Never retry a consumable trigger: the first request may have succeeded despite a lost response. */
  async addLabelsOnce(issueNumber: number, labels: string[]): Promise<void> {
    const { data } = await this.request<Array<{ name: string }>>(
      {
        method: 'POST',
        url: `${this.baseUrl}issues/${issueNumber}/labels`,
        data: { labels },
        maxAttempts: 1,
      },
      labels.map((name) => ({ name }))
    );
    if (labels.some((name) => !data.some((label) => label.name === name))) {
      throw new Error(`GitHub did not apply the requested labels to #${issueNumber}`);
    }
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
   * Every issue of the repository matching the filters, following `Link: rel="next"` pagination.
   * Read-only, so it also runs in dry-run mode. Pull requests share the issue shape and are
   * dropped.
   */
  async listIssues({
    state,
    labels,
    since,
    sort,
    direction,
    pageIntervalMs = DEFAULT_PAGE_INTERVAL_MS,
  }: ListIssuesOptions): Promise<GithubIssue[]> {
    const params = new URLSearchParams({ state, per_page: String(ISSUES_PER_PAGE) });
    if (labels?.length) {
      params.set('labels', labels.join(','));
    }
    if (since) {
      params.set('since', since.toISOString());
    }
    if (sort) {
      params.set('sort', sort);
    }
    if (direction) {
      params.set('direction', direction);
    }

    const issues: GithubIssue[] = [];
    let url: string | undefined = Url.resolve(this.baseUrl, `issues?${params}`);
    let page = 0;

    while (url) {
      if (page > 0 && pageIntervalMs > 0) {
        await sleep(pageIntervalMs);
      }
      page += 1;

      const resp = await this.request<Array<GithubIssue & { pull_request?: unknown }>>(
        { method: 'GET', url, safeForDryRun: true },
        []
      );
      for (const issue of resp.data) {
        if (!issue.pull_request) {
          issues.push({ ...issue, body: issue.body ?? '' });
        }
      }
      this.log.debug(`Listed ${issues.length} issues (${state}) after ${page} pages`);

      // Pages can hold fewer items than requested even when more follow, so trust the Link header
      url = nextPageUrl(resp.headers.get('link'));
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

      if (options.method !== 'GET') {
        await this.paceWrite();
      }

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
          await sleep(waitMs);
          continue;
        }
        throw error;
      }

      if (!response.ok) {
        const errorResponseLog = `[${options.method} ${options.url}] ${response.status} ${response.statusText} Error`;
        if (response.status >= 500 && attempt < maxAttempts) {
          const waitMs = 1000 * attempt;
          this.log.error(`${errorResponseLog}: waiting ${waitMs}ms to retry`);
          await sleep(waitMs);
          continue;
        }

        // Rate limited: wait as long as GitHub says, or a backing-off minute when it does not say
        const body = await response.text();
        const retryAfterSeconds = rateLimitRetryAfterSeconds(
          response.status,
          response.headers,
          body,
          attempt
        );
        if (retryAfterSeconds > 0 && attempt < maxAttempts) {
          this.log.warning(`${errorResponseLog}: rate limited, waiting ${retryAfterSeconds}s`);
          await sleep(retryAfterSeconds * 1000);
          continue;
        }

        throw new Error(`${errorResponseLog}: ${body}`);
      }

      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: (await response.json()) as T,
      };
    }
  }

  /** Writes take turns, so concurrent callers are spaced out too. */
  private paceWrite(): Promise<void> {
    const turn = this.writeQueue.then(async () => {
      const waitMs = this.lastWriteAt + WRITE_INTERVAL_MS - Date.now();
      if (waitMs > 0) {
        await sleep(waitMs);
      }
      this.lastWriteAt = Date.now();
    });
    this.writeQueue = turn.catch(() => {});
    return turn;
  }
}
