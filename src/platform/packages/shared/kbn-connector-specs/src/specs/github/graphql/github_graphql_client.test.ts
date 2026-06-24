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
  executeGitHubGraphQL,
  extractPageInfo,
  resolveGraphQLApiUrl,
  shouldBackoffForRateLimit,
} from './github_graphql_client';

describe('github_graphql_client', () => {
  describe('extractPageInfo', () => {
    it('extracts pageInfo from a nested path', () => {
      const data = {
        organization: {
          repositories: {
            pageInfo: {
              hasNextPage: true,
              endCursor: 'cursor123',
            },
          },
        },
      };

      expect(extractPageInfo(data, 'organization.repositories')).toEqual({
        hasNextPage: true,
        endCursor: 'cursor123',
      });
    });
  });

  describe('resolveGraphQLApiUrl', () => {
    it('uses configured graphqlApiUrl when present', () => {
      expect(resolveGraphQLApiUrl({ graphqlApiUrl: 'https://example.test/graphql' })).toBe(
        'https://example.test/graphql'
      );
    });

    it('falls back to the GitHub GraphQL endpoint', () => {
      expect(resolveGraphQLApiUrl({})).toBe('https://api.github.com/graphql');
    });
  });

  describe('shouldBackoffForRateLimit', () => {
    it('returns true when remaining budget is low', () => {
      expect(
        shouldBackoffForRateLimit({
          limit: 5000,
          remaining: 50,
          resetAt: '2026-06-24T12:00:00Z',
        })
      ).toBe(true);
    });

    it('returns false when remaining budget is healthy', () => {
      expect(
        shouldBackoffForRateLimit({
          limit: 5000,
          remaining: 4000,
          resetAt: '2026-06-24T12:00:00Z',
        })
      ).toBe(false);
    });
  });

  describe('executeGitHubGraphQL', () => {
    const mockPost = jest.fn();
    const mockContext = {
      client: { post: mockPost },
      log: { debug: jest.fn(), error: jest.fn() },
      config: { graphqlApiUrl: 'https://api.github.com/graphql' },
    } as unknown as ActionContext;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns normalized data, pageInfo, and rateLimit', async () => {
      mockPost.mockResolvedValue({
        headers: {},
        data: {
          data: {
            organization: {
              repositories: {
                pageInfo: { hasNextPage: false, endCursor: null },
                nodes: [{ name: 'kibana' }],
              },
            },
          },
          extensions: {
            rateLimit: {
              limit: 5000,
              remaining: 4990,
              resetAt: '2026-06-24T12:00:00Z',
            },
          },
        },
      });

      const result = await executeGitHubGraphQL({
        ctx: mockContext,
        body: { query: 'query OrgRepos { organization(login: "elastic") { id } }' },
        pageInfoPath: 'organization.repositories',
        templateId: 'orgCatalog.repos',
      });

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.github.com/graphql',
        { query: 'query OrgRepos { organization(login: "elastic") { id } }' },
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result.templateId).toBe('orgCatalog.repos');
      expect(result.pageInfo).toEqual({ hasNextPage: false, endCursor: null });
      expect(result.rateLimit?.remaining).toBe(4990);
      expect(result.shouldBackoff).toBe(false);
    });

    it('rejects mutation documents before calling the API', async () => {
      await expect(
        executeGitHubGraphQL({
          ctx: mockContext,
          body: { query: 'mutation X { createIssue(input: {}) { issue { id } } }' },
        })
      ).rejects.toThrow('GraphQL mutations are not allowed');

      expect(mockPost).not.toHaveBeenCalled();
    });

    it('throws when GraphQL errors are returned', async () => {
      mockPost.mockResolvedValue({
        headers: {},
        data: {
          errors: [{ message: 'Could not resolve to a Repository' }],
        },
      });

      await expect(
        executeGitHubGraphQL({
          ctx: mockContext,
          body: { query: 'query X { repository(owner: "a", name: "b") { id } }' },
        })
      ).rejects.toThrow('Could not resolve to a Repository');
    });
  });
});
