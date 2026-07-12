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

export const orgCatalogTeamsTemplate: GitHubQueryTemplate = {
  id: 'orgCatalog.teams',
  description: 'List teams for a GitHub organization with cursor pagination.',
  document: `
    query OrgCatalogTeams($org: String!, $first: Int!, $after: String) {
      rateLimit {
        cost
        remaining
        limit
        resetAt
      }
      organization(login: $org) {
        teams(first: $first, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            databaseId
            slug
            name
            description
            privacy
            combinedSlug
            parentTeam {
              slug
            }
            members {
              totalCount
            }
            repositories {
              totalCount
            }
          }
        }
      }
    }
  `,
  variablesSchema: z.object({ org: z.string().min(1) }) as z.ZodType<Record<string, unknown>>,
  resultPath: 'organization.teams',
  isPaginated: true,
};
