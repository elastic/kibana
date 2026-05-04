/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { FieldValue } from '@elastic/elasticsearch/lib/api/types';

/**
 * Builds the base bool filter for workflow queries scoped to a space.
 * By default excludes soft-deleted documents (deleted_at exists).
 */
export const workflowSpaceFilter = (
  spaceId: string,
  opts?: { includeDeleted?: boolean }
): { must: estypes.QueryDslQueryContainer[]; must_not: estypes.QueryDslQueryContainer[] } => {
  const must: estypes.QueryDslQueryContainer[] = [{ term: { spaceId } }];
  const mustNot: estypes.QueryDslQueryContainer[] = opts?.includeDeleted
    ? []
    : [{ exists: { field: 'deleted_at' } }];
  return { must, must_not: mustNot };
};

/**
 * Builds `terms` filter clauses from optional arrays. Skips undefined or empty arrays.
 */
export const buildConditionalTermsFilters = (
  filters: ReadonlyArray<{ field: string; values: FieldValue[] | undefined }>
): estypes.QueryDslQueryContainer[] =>
  filters.reduce<estypes.QueryDslQueryContainer[]>((clauses, { field, values }) => {
    if (values !== undefined && values.length > 0) {
      clauses.push({ terms: { [field]: values } });
    }
    return clauses;
  }, []);

/**
 * Builds the full-text search clause used by the workflow list endpoint.
 * Combines phrase matching, best-fields, prefix matching, and wildcard matching
 * across name, description, and tags fields with appropriate boosts.
 */
export const buildWorkflowTextSearchClause = (query: string): estypes.QueryDslQueryContainer => ({
  bool: {
    should: [
      {
        multi_match: {
          query,
          fields: ['name^3', 'description^2'],
          type: 'phrase',
          boost: 3,
        },
      },
      {
        multi_match: {
          query,
          fields: ['name^2', 'description', 'tags'],
          type: 'best_fields',
          boost: 2,
        },
      },
      {
        multi_match: {
          query,
          fields: ['name^2', 'description'],
          type: 'phrase_prefix',
          boost: 1.5,
        },
      },
      {
        bool: {
          should: [
            {
              wildcard: {
                'name.keyword': {
                  value: `*${query}*`,
                  case_insensitive: true,
                  boost: 1,
                },
              },
            },
            {
              wildcard: {
                'description.keyword': {
                  value: `*${query}*`,
                  case_insensitive: true,
                  boost: 0.5,
                },
              },
            },
            {
              wildcard: {
                tags: {
                  value: `*${query}*`,
                  case_insensitive: true,
                  boost: 0.5,
                },
              },
            },
          ],
        },
      },
    ],
    minimum_should_match: 1,
  },
});
