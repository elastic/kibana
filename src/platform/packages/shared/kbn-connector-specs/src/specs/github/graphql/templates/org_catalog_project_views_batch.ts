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

export const orgCatalogProjectViewsBatchTemplate: GitHubQueryTemplate = {
  id: 'orgCatalog.projectViewsBatch',
  description:
    'Batch-fetch saved views for many GitHub Projects v2 in one request. Pass projectIds (array of node ids from orgCatalog.projects). Returns one ProjectV2 per requested id; each node carries its own views connection. Views are NOT per-project paginated (a single page of $first is returned per project), so use this only for projects whose views fit one page.',
  document: `
    query OrgCatalogProjectViewsBatch($projectIds: [ID!]!, $first: Int!) {
      rateLimit {
        cost
        remaining
        limit
        resetAt
      }
      nodes(ids: $projectIds) {
        ... on ProjectV2 {
          id
          number
          title
          views(first: $first) {
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
    projectIds: z.array(z.string().min(1)).min(1),
    first: z.number().int().positive().max(100),
  }) as z.ZodType<Record<string, unknown>>,
  resultPath: 'nodes',
  isPaginated: false,
};
