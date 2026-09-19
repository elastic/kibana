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

export const orgCatalogProjectViewsTemplate: GitHubQueryTemplate = {
  id: 'orgCatalog.projectViews',
  description:
    'List saved views for a GitHub Project v2 by project node id. Pass projectId from orgCatalog.projects.',
  document: `
    query OrgCatalogProjectViews($projectId: ID!, $first: Int!, $after: String) {
      rateLimit {
        cost
        remaining
        limit
        resetAt
      }
      node(id: $projectId) {
        ... on ProjectV2 {
          id
          number
          title
          views(first: $first, after: $after) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              number
              name
              filter
            }
          }
        }
      }
    }
  `,
  variablesSchema: z.object({
    projectId: z.string().min(1),
  }) as z.ZodType<Record<string, unknown>>,
  resultPath: 'node.views',
  isPaginated: true,
};
