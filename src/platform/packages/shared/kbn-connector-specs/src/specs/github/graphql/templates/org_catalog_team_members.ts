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

export const orgCatalogTeamMembersTemplate: GitHubQueryTemplate = {
  id: 'orgCatalog.teamMembers',
  description: 'List members of a GitHub organization team with cursor pagination.',
  document: `
    query OrgCatalogTeamMembers($org: String!, $teamSlug: String!, $first: Int!, $after: String) {
      rateLimit {
        cost
        remaining
        limit
        resetAt
      }
      organization(login: $org) {
        team(slug: $teamSlug) {
          members(first: $first, after: $after) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              login
              name
              email
              avatarUrl
              company
              location
            }
          }
        }
      }
    }
  `,
  variablesSchema: z.object({
    org: z.string().min(1),
    teamSlug: z.string().min(1),
  }) as z.ZodType<Record<string, unknown>>,
  resultPath: 'organization.team.members',
  isPaginated: true,
};
