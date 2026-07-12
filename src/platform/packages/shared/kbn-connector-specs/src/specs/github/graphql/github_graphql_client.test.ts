/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../../connector_spec';
import {
  GitHubRateLimitError,
  isGitHubRateLimitError,
  resolveGraphQLApiUrl,
  shouldBackoffForRateLimit,
  unwrapTemplateResult,
  executeRunQueryTemplate,
} from './github_graphql_client';
import { GITHUB_QUERY_TEMPLATES } from './catalog';
import { validateReadOnlyGraphQLQuery } from './validate_read_only_query';
import { orgCatalogReposTemplate } from './templates/org_catalog_repos';
import { activitySearchIssuesTemplate } from './templates/activity_search_issues';
import { graphIssueGraphTemplate } from './templates/graph_issue_graph';

// ─── helpers ──────────────────────────────────────────────────────────────────

const makeRateLimit = (remaining = 4000) => ({
  cost: 1,
  limit: 5000,
  remaining,
  resetAt: '2026-07-11T12:00:00Z',
});

const makeContext = (mockPost: jest.Mock): ActionContext =>
  ({
    client: { post: mockPost },
    log: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() },
    config: { graphqlApiUrl: 'https://api.github.com/graphql' },
  } as unknown as ActionContext);

// ─── resolveGraphQLApiUrl ──────────────────────────────────────────────────────

describe('resolveGraphQLApiUrl', () => {
  it('uses configured graphqlApiUrl', () => {
    expect(resolveGraphQLApiUrl({ graphqlApiUrl: 'https://ghe.example.com/graphql' })).toBe(
      'https://ghe.example.com/graphql'
    );
  });

  it('falls back to the public GitHub endpoint', () => {
    expect(resolveGraphQLApiUrl({})).toBe('https://api.github.com/graphql');
    expect(resolveGraphQLApiUrl(undefined)).toBe('https://api.github.com/graphql');
  });
});

// ─── shouldBackoffForRateLimit ─────────────────────────────────────────────────

describe('shouldBackoffForRateLimit', () => {
  it('returns true when remaining is at or below threshold (100)', () => {
    expect(shouldBackoffForRateLimit(makeRateLimit(100))).toBe(true);
    expect(shouldBackoffForRateLimit(makeRateLimit(50))).toBe(true);
    expect(shouldBackoffForRateLimit(makeRateLimit(0))).toBe(true);
  });

  it('returns false when remaining is above threshold', () => {
    expect(shouldBackoffForRateLimit(makeRateLimit(101))).toBe(false);
    expect(shouldBackoffForRateLimit(makeRateLimit(4000))).toBe(false);
  });

  it('returns false when rateLimit is undefined', () => {
    expect(shouldBackoffForRateLimit(undefined)).toBe(false);
  });
});

// ─── static assertions: all templates pass read-only check and have rateLimit ──

describe('GITHUB_QUERY_TEMPLATES static assertions', () => {
  it('every template document passes validateReadOnlyGraphQLQuery', () => {
    for (const template of GITHUB_QUERY_TEMPLATES) {
      expect(() => validateReadOnlyGraphQLQuery(template.document)).not.toThrow();
    }
  });

  it('every template document contains a rateLimit selection', () => {
    for (const template of GITHUB_QUERY_TEMPLATES) {
      expect(template.document).toMatch(/\brateLimit\b/);
      expect(template.document).toMatch(/\bcost\b/);
      expect(template.document).toMatch(/\bremaining\b/);
    }
  });

  it('all 11 expected template IDs are present', () => {
    const ids = GITHUB_QUERY_TEMPLATES.map((t) => t.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'orgCatalog.repos',
        'orgCatalog.teams',
        'orgCatalog.teamMembers',
        'orgCatalog.members',
        'orgCatalog.projects',
        'orgCatalog.projectViews',
        'orgCatalog.projectItems',
        'activity.searchIssues',
        'activity.searchPullRequests',
        'graph.issueGraph',
        'graph.pullRequestGraph',
      ])
    );
    expect(ids).toHaveLength(11);
  });
});

// ─── unwrapTemplateResult ──────────────────────────────────────────────────────

describe('unwrapTemplateResult', () => {
  describe('paginated templates', () => {
    it('extracts nodes, pageInfo from a connection', () => {
      const result = unwrapTemplateResult(
        {
          organization: {
            repositories: {
              nodes: [{ name: 'kibana' }, { name: 'elasticsearch' }],
              pageInfo: { hasNextPage: true, endCursor: 'cursor123' },
            },
          },
        },
        orgCatalogReposTemplate
      );
      expect(result.data).toEqual([{ name: 'kibana' }, { name: 'elasticsearch' }]);
      expect(result.pageInfo).toEqual({ hasNextPage: true, endCursor: 'cursor123' });
      expect(result.meta).toBeUndefined();
    });

    it('extracts sibling scalar fields into meta', () => {
      const result = unwrapTemplateResult(
        {
          search: {
            issueCount: 42,
            nodes: [{ id: 'I_1' }],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
        activitySearchIssuesTemplate
      );
      expect(result.data).toEqual([{ id: 'I_1' }]);
      expect(result.meta).toEqual({ issueCount: 42 });
      expect(result.pageInfo).toEqual({ hasNextPage: false, endCursor: null });
    });

    it('returns empty array and no next page when nodes are missing', () => {
      const result = unwrapTemplateResult(
        {
          organization: {
            repositories: {
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        },
        orgCatalogReposTemplate
      );
      expect(result.data).toEqual([]);
      expect(result.pageInfo.hasNextPage).toBe(false);
    });

    it('returns empty array when path does not resolve', () => {
      const result = unwrapTemplateResult({}, orgCatalogReposTemplate);
      expect(result.data).toEqual([]);
      expect(result.pageInfo).toEqual({ hasNextPage: false, endCursor: null });
    });
  });

  describe('single-entity templates', () => {
    it('wraps the entity in a one-element array', () => {
      const issue = { id: 'I_1', number: 1, title: 'Bug' };
      const result = unwrapTemplateResult(
        { repository: { issue } },
        graphIssueGraphTemplate
      );
      expect(result.data).toEqual([issue]);
      expect(result.pageInfo).toEqual({ hasNextPage: false, endCursor: null });
      expect(result.meta).toBeUndefined();
    });

    it('returns empty array when entity is null', () => {
      const result = unwrapTemplateResult(
        { repository: { issue: null } },
        graphIssueGraphTemplate
      );
      expect(result.data).toEqual([]);
      expect(result.pageInfo).toEqual({ hasNextPage: false, endCursor: null });
    });
  });
});

// ─── GitHubRateLimitError ──────────────────────────────────────────────────────

describe('GitHubRateLimitError', () => {
  it('is identifiable by name across realms', () => {
    const err = new GitHubRateLimitError({ message: 'rate limited', resetAt: '2026-07-11T13:00:00Z' });
    expect(isGitHubRateLimitError(err)).toBe(true);
    expect(err.resetAt).toBe('2026-07-11T13:00:00Z');

    const crossRealm = Object.assign(new Error('rate limited'), {
      name: 'GitHubRateLimitError',
      resetAt: '2026-07-11T13:00:00Z',
    });
    expect(isGitHubRateLimitError(crossRealm)).toBe(true);
  });

  it('returns false for plain errors', () => {
    expect(isGitHubRateLimitError(new Error('boom'))).toBe(false);
  });
});

// ─── executeRunQueryTemplate ───────────────────────────────────────────────────

describe('executeRunQueryTemplate', () => {
  const mockPost = jest.fn();

  const makeSuccessResponse = (nodes: unknown[] = [], extra: Record<string, unknown> = {}) => ({
    headers: {},
    data: {
      data: {
        rateLimit: makeRateLimit(),
        organization: {
          repositories: {
            nodes,
            pageInfo: { hasNextPage: false, endCursor: null },
            ...extra,
          },
        },
      },
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('successful results', () => {
    it('returns normalized output shape for paginated template', async () => {
      const ctx = makeContext(mockPost);
      mockPost.mockResolvedValue(makeSuccessResponse([{ name: 'kibana' }]));

      const result = await executeRunQueryTemplate({
        ctx,
        template: orgCatalogReposTemplate,
        variables: { org: 'elastic', first: 10 },
      });

      expect(result.data).toEqual([{ name: 'kibana' }]);
      expect(result.pageInfo).toEqual({ hasNextPage: false, endCursor: null });
      expect(result.rateLimit).toEqual(makeRateLimit());
      expect(result.shouldBackoff).toBe(false);
      expect(result.templateId).toBe('orgCatalog.repos');
    });

    it('sets shouldBackoff=true when remaining <= 100', async () => {
      const ctx = makeContext(mockPost);
      mockPost.mockResolvedValue({
        headers: {},
        data: {
          data: {
            rateLimit: makeRateLimit(50),
            organization: {
              repositories: {
                nodes: [],
                pageInfo: { hasNextPage: false, endCursor: null },
              },
            },
          },
        },
      });

      const result = await executeRunQueryTemplate({
        ctx,
        template: orgCatalogReposTemplate,
        variables: { org: 'elastic', first: 10 },
      });

      expect(result.shouldBackoff).toBe(true);
    });

    it('falls back to extensions.rateLimit when data.rateLimit is absent', async () => {
      const ctx = makeContext(mockPost);
      mockPost.mockResolvedValue({
        headers: {},
        data: {
          data: {
            organization: {
              repositories: {
                nodes: [],
                pageInfo: { hasNextPage: false, endCursor: null },
              },
            },
          },
          extensions: { rateLimit: makeRateLimit(4500) },
        },
      });

      const result = await executeRunQueryTemplate({
        ctx,
        template: orgCatalogReposTemplate,
        variables: { org: 'elastic', first: 10 },
      });

      expect(result.rateLimit.remaining).toBe(4500);
    });

    it('strips rateLimit from data before unwrapping (not present in meta)', async () => {
      const ctx = makeContext(mockPost);
      mockPost.mockResolvedValue({
        headers: {},
        data: {
          data: {
            rateLimit: makeRateLimit(),
            search: {
              issueCount: 7,
              nodes: [],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        },
      });

      const result = await executeRunQueryTemplate({
        ctx,
        template: activitySearchIssuesTemplate,
        variables: { query: 'org:elastic', first: 10 },
      });

      expect(result.meta).toEqual({ issueCount: 7 });
      expect(result.meta).not.toHaveProperty('rateLimit');
    });
  });

  describe('error tiers (D5)', () => {
    it('throws a plain error for GraphQL errors array (fail-closed)', async () => {
      const ctx = makeContext(mockPost);
      mockPost.mockResolvedValue({
        headers: {},
        data: {
          errors: [
            { message: 'Could not resolve to a Repository', path: ['repository'] },
          ],
        },
      });

      await expect(
        executeRunQueryTemplate({
          ctx,
          template: orgCatalogReposTemplate,
          variables: { org: 'elastic', first: 10 },
        })
      ).rejects.toThrow('Could not resolve to a Repository');
    });

    it('throws a descriptive error for 401', async () => {
      const ctx = makeContext(mockPost);
      const err = Object.assign(new Error('Unauthorized'), {
        response: { status: 401, headers: {} },
      });
      mockPost.mockRejectedValue(err);

      await expect(
        executeRunQueryTemplate({
          ctx,
          template: orgCatalogReposTemplate,
          variables: { org: 'elastic', first: 10 },
        })
      ).rejects.toThrow(/missing required scopes/);
    });

    it('throws a descriptive error for 403 without rate-limit headers', async () => {
      const ctx = makeContext(mockPost);
      const err = Object.assign(new Error('Forbidden'), {
        response: { status: 403, headers: {} },
      });
      mockPost.mockRejectedValue(err);

      await expect(
        executeRunQueryTemplate({
          ctx,
          template: orgCatalogReposTemplate,
          variables: { org: 'elastic', first: 10 },
        })
      ).rejects.toThrow(/missing required scopes/);
    });

    it('throws GitHubRateLimitError for 429 after retries exhausted', async () => {
      jest.useFakeTimers();
      const ctx = makeContext(mockPost);
      const err = Object.assign(new Error('Too Many Requests'), {
        response: { status: 429, headers: { 'retry-after': '2' } },
      });
      mockPost.mockRejectedValue(err);

      const promise = executeRunQueryTemplate({
        ctx,
        template: orgCatalogReposTemplate,
        variables: { org: 'elastic', first: 10 },
      });

      // Advance timers to exhaust the 2 retries
      for (let i = 0; i < 3; i++) {
        await Promise.resolve();
        jest.runAllTimers();
      }

      await expect(promise).rejects.toBeInstanceOf(GitHubRateLimitError);
      jest.useRealTimers();
    });

    it('succeeds on retry after transient 429', async () => {
      jest.useFakeTimers();
      const ctx = makeContext(mockPost);
      const rateLimitErr = Object.assign(new Error('Too Many Requests'), {
        response: { status: 429, headers: { 'retry-after': '1' } },
      });

      mockPost
        .mockRejectedValueOnce(rateLimitErr)
        .mockResolvedValue(makeSuccessResponse([{ name: 'kibana' }]));

      const promise = executeRunQueryTemplate({
        ctx,
        template: orgCatalogReposTemplate,
        variables: { org: 'elastic', first: 10 },
      });

      await Promise.resolve();
      jest.runAllTimers();

      const result = await promise;
      expect(result.data).toEqual([{ name: 'kibana' }]);
      expect(mockPost).toHaveBeenCalledTimes(2);
      jest.useRealTimers();
    });

    it('throws GitHubRateLimitError immediately when retry-after exceeds the cap', async () => {
      const ctx = makeContext(mockPost);
      const err = Object.assign(new Error('Forbidden'), {
        response: {
          status: 403,
          headers: { 'retry-after': '120', 'x-ratelimit-remaining': '0' },
        },
      });
      mockPost.mockRejectedValue(err);

      await expect(
        executeRunQueryTemplate({
          ctx,
          template: orgCatalogReposTemplate,
          variables: { org: 'elastic', first: 10 },
        })
      ).rejects.toBeInstanceOf(GitHubRateLimitError);
      expect(mockPost).toHaveBeenCalledTimes(1);
    });

    it('throws GitHubRateLimitError for 403 with rate-limit headers', async () => {
      jest.useFakeTimers();
      const ctx = makeContext(mockPost);
      const err = Object.assign(new Error('Forbidden'), {
        response: {
          status: 403,
          headers: { 'x-ratelimit-remaining': '0', 'retry-after': '2' },
        },
      });
      mockPost.mockRejectedValue(err);

      const promise = executeRunQueryTemplate({
        ctx,
        template: orgCatalogReposTemplate,
        variables: { org: 'elastic', first: 10 },
      });

      for (let i = 0; i < 3; i++) {
        await Promise.resolve();
        jest.runAllTimers();
      }

      await expect(promise).rejects.toBeInstanceOf(GitHubRateLimitError);
      jest.useRealTimers();
    });

    it('includes resetAt in GitHubRateLimitError from x-ratelimit-reset header', async () => {
      jest.useFakeTimers();
      const ctx = makeContext(mockPost);
      const resetEpoch = Math.floor(Date.now() / 1000) + 300;
      const err = Object.assign(new Error('Too Many Requests'), {
        response: {
          status: 429,
          headers: { 'x-ratelimit-reset': String(resetEpoch) },
        },
      });
      mockPost.mockRejectedValue(err);

      const promise = executeRunQueryTemplate({
        ctx,
        template: orgCatalogReposTemplate,
        variables: { org: 'elastic', first: 10 },
      });

      for (let i = 0; i < 3; i++) {
        await Promise.resolve();
        jest.runAllTimers();
      }

      try {
        await promise;
      } catch (error) {
        expect(isGitHubRateLimitError(error)).toBe(true);
        const rateLimitError = error as GitHubRateLimitError;
        expect(rateLimitError.resetAt).toBeDefined();
      }
      jest.useRealTimers();
    });
  });
});

// ─── per-template contract tests ──────────────────────────────────────────────

describe('per-template contract tests', () => {
  const mockPost = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const makeTemplateResponse = (
    template: (typeof GITHUB_QUERY_TEMPLATES)[number],
    overrideData: Record<string, unknown>
  ) => ({
    headers: {},
    data: {
      data: {
        rateLimit: makeRateLimit(),
        ...overrideData,
      },
    },
  });

  it('orgCatalog.repos - returns nodes from organization.repositories', async () => {
    const ctx = makeContext(mockPost);
    const repo = { id: 'R_1', name: 'kibana' };
    mockPost.mockResolvedValue(
      makeTemplateResponse(orgCatalogReposTemplate, {
        organization: {
          repositories: {
            nodes: [repo],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
      })
    );

    const result = await executeRunQueryTemplate({
      ctx,
      template: orgCatalogReposTemplate,
      variables: { org: 'elastic', first: 10 },
    });

    expect(result.data).toEqual([repo]);
    expect(result.templateId).toBe('orgCatalog.repos');
    expect(result.rateLimit).toBeDefined();
    expect(result.shouldBackoff).toBe(false);
  });

  it('activity.searchIssues - returns nodes and issueCount in meta', async () => {
    const ctx = makeContext(mockPost);
    const issue = { id: 'I_1', number: 1, title: 'Bug' };
    mockPost.mockResolvedValue(
      makeTemplateResponse(activitySearchIssuesTemplate, {
        search: {
          issueCount: 1,
          nodes: [issue],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      })
    );

    const result = await executeRunQueryTemplate({
      ctx,
      template: activitySearchIssuesTemplate,
      variables: { query: 'org:elastic', first: 10 },
    });

    expect(result.data).toEqual([issue]);
    expect(result.meta).toEqual({ issueCount: 1 });
    expect(result.templateId).toBe('activity.searchIssues');
  });

  it('graph.issueGraph - wraps entity in one-element array', async () => {
    const ctx = makeContext(mockPost);
    const issue = { id: 'I_1', number: 42, title: 'My Issue' };
    mockPost.mockResolvedValue(
      makeTemplateResponse(graphIssueGraphTemplate, {
        repository: { issue },
      })
    );

    const result = await executeRunQueryTemplate({
      ctx,
      template: graphIssueGraphTemplate,
      variables: { owner: 'elastic', repo: 'kibana', number: 42 },
    });

    expect(result.data).toEqual([issue]);
    expect(result.pageInfo).toEqual({ hasNextPage: false, endCursor: null });
    expect(result.templateId).toBe('graph.issueGraph');
  });
});

// ─── Zod variable validation ───────────────────────────────────────────────────

describe('template variablesSchema validation', () => {
  it('orgCatalog.repos accepts { org: string }', () => {
    const result = orgCatalogReposTemplate.variablesSchema.safeParse({ org: 'elastic' });
    expect(result.success).toBe(true);
  });

  it('orgCatalog.repos rejects missing org', () => {
    const result = orgCatalogReposTemplate.variablesSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('orgCatalog.repos rejects empty org', () => {
    const result = orgCatalogReposTemplate.variablesSchema.safeParse({ org: '' });
    expect(result.success).toBe(false);
  });

  it('graph.issueGraph accepts { owner, repo, number: int }', () => {
    const result = graphIssueGraphTemplate.variablesSchema.safeParse({
      owner: 'elastic',
      repo: 'kibana',
      number: 42,
    });
    expect(result.success).toBe(true);
  });

  it('graph.issueGraph rejects float number', () => {
    const result = graphIssueGraphTemplate.variablesSchema.safeParse({
      owner: 'elastic',
      repo: 'kibana',
      number: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it('activity.searchIssues accepts { query: string }', () => {
    const result = activitySearchIssuesTemplate.variablesSchema.safeParse({
      query: 'org:elastic',
    });
    expect(result.success).toBe(true);
  });

  it('activity.searchIssues rejects empty query', () => {
    const result = activitySearchIssuesTemplate.variablesSchema.safeParse({ query: '' });
    expect(result.success).toBe(false);
  });
});
