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

export const orgCatalogReposTemplate: GitHubQueryTemplate = {
  id: 'orgCatalog.repos',
  description: 'List repositories for a GitHub organization with cursor pagination.',
  document: `
    query OrgCatalogRepos($org: String!, $first: Int!, $after: String) {
      rateLimit {
        cost
        remaining
        limit
        resetAt
      }
      organization(login: $org) {
        repositories(first: $first, after: $after, orderBy: { field: PUSHED_AT, direction: DESC }) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            databaseId
            name
            nameWithOwner
            description
            url
            isPrivate
            isArchived
            isFork
            forkCount
            stargazerCount
            diskUsage
            visibility
            primaryLanguage {
              name
            }
            repositoryTopics(first: 20) {
              nodes {
                topic {
                  name
                }
              }
            }
            defaultBranchRef {
              name
            }
            createdAt
            pushedAt
            updatedAt
            issues(states: OPEN) {
              totalCount
            }
          }
        }
      }
    }
  `,
  variablesSchema: z.object({ org: z.string().min(1) }) as z.ZodType<Record<string, unknown>>,
  resultPath: 'organization.repositories',
  isPaginated: true,
};
