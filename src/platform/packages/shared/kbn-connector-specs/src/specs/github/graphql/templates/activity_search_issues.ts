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

export const activitySearchIssuesTemplate: GitHubQueryTemplate = {
  id: 'activity.searchIssues',
  description:
    'Search issues org-wide. Pass a GitHub search query (e.g. "org:elastic updated:>2026-06-01 -is:pr").',
  document: `
    query ActivitySearchIssues($query: String!, $first: Int!, $after: String) {
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
          ... on Issue {
            id
            number
            title
            state
            url
            createdAt
            updatedAt
            body
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
            labels(first: 20) {
              nodes {
                name
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
