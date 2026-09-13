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

export const orgCatalogProjectItemsTemplate: GitHubQueryTemplate = {
  id: 'orgCatalog.projectItems',
  description:
    'List items for a GitHub Project v2 by project node id with cursor pagination. Pass projectId from orgCatalog.projects.',
  document: `
    query OrgCatalogProjectItems($projectId: ID!, $first: Int!, $after: String) {
      rateLimit {
        cost
        remaining
        limit
        resetAt
      }
      node(id: $projectId) {
        ... on ProjectV2 {
          items(first: $first, after: $after) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              type
              createdAt
              updatedAt
              content {
                __typename
                ... on Issue {
                  id
                  number
                  title
                  url
                  state
                  repository {
                    name
                    nameWithOwner
                  }
                }
                ... on PullRequest {
                  id
                  number
                  title
                  url
                  state
                  repository {
                    name
                    nameWithOwner
                  }
                }
                ... on DraftIssue {
                  id
                  title
                  body
                }
              }
              fieldValues(first: 20) {
                nodes {
                  __typename
                  ... on ProjectV2ItemFieldTextValue {
                    text
                    field {
                      ... on ProjectV2FieldCommon {
                        id
                        name
                      }
                    }
                  }
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name
                    field {
                      ... on ProjectV2FieldCommon {
                        id
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `,
  variablesSchema: z.object({
    projectId: z.string().min(1),
  }) as z.ZodType<Record<string, unknown>>,
  resultPath: 'node.items',
  isPaginated: true,
};
