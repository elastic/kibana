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

// Every word must match, but each word can match a different field (e.g. name + tag).
// A single multi_match cannot do this: cross_fields does not mix text fields with keyword `tags`.
const buildAllWordsClause = (query: string): estypes.QueryDslQueryContainer[] => {
  const words = query.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word));
  if (words.length === 0) {
    return [];
  }
  return [
    {
      bool: {
        must: words.map((word) => ({
          multi_match: {
            query: word,
            fields: ['name^2', 'description', 'tags'],
            type: 'best_fields',
            operator: 'and',
          },
        })),
        boost: 2,
      },
    },
  ];
};

/**
 * Builds the full-text search clause used by the workflow list endpoint.
 * Combines exact-name, phrase, all-words, prefix, and wildcard matching
 * across name, description, and tags fields with appropriate boosts.
 */
export const buildWorkflowTextSearchClause = (query: string): estypes.QueryDslQueryContainer => ({
  bool: {
    should: [
      {
        term: {
          'name.keyword': {
            value: query.trim(),
            case_insensitive: true,
            boost: 10,
          },
        },
      },
      {
        multi_match: {
          query,
          fields: ['name^3', 'description^2'],
          type: 'phrase',
          boost: 3,
        },
      },
      ...buildAllWordsClause(query),
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
