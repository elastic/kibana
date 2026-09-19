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

export const orgCatalogMembersTemplate: GitHubQueryTemplate = {
  id: 'orgCatalog.members',
  description: 'List members of a GitHub organization with role information.',
  document: `
    query OrgCatalogMembers($org: String!, $first: Int!, $after: String) {
      rateLimit {
        cost
        remaining
        limit
        resetAt
      }
      organization(login: $org) {
        membersWithRole(first: $first, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            role
            user {
              id
              login
              name
              email
              company
              location
              avatarUrl
            }
          }
        }
      }
    }
  `,
  variablesSchema: z.object({ org: z.string().min(1) }) as z.ZodType<Record<string, unknown>>,
  resultPath: 'organization.membersWithRole',
  isPaginated: true,
};
