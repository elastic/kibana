/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { GitHubQueryTemplate } from '../types';

export const activitySearchPullRequestsTemplate: GitHubQueryTemplate = {
  id: 'activity.searchPullRequests',
  description:
    'Search pull requests org-wide. Pass a GitHub search query (e.g. "org:elastic is:pr updated:>2026-06-01").',
  document: `
    query ActivitySearchPullRequests($query: String!, $first: Int!, $after: String) {
      rateLimit {
        cost
        remaining
        limit
        resetAt
      }
      search(type: ISSUE, query: $query, first: $first, after: $after) {
        issueCount
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          ... on PullRequest {
            id
            number
            title
            state
            url
            createdAt
            updatedAt
            mergedAt
            isDraft
            author {
              login
            }
            repository {
              name
              nameWithOwner
              owner {
                login
              }
            }
            reviews(first: 10) {
              nodes {
                id
                state
                submittedAt
                author {
                  login
                }
              }
            }
          }
        }
      }
    }
  `,
  variablesSchema: z.object({
    query: z.string().min(1),
  }) as z.ZodType<Record<string, unknown>>,
  resultPath: 'search',
  isPaginated: true,
};
