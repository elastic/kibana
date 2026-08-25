/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectTypeIdTuple } from '@kbn/core-saved-objects-common';
import type { SearchOperator } from './query_params';

export function getReferencesFilter({
  references,
  operator = 'OR',
  maxTermsPerClause = 1000,
  must = true,
}: {
  references: SavedObjectTypeIdTuple[];
  operator?: SearchOperator;
  maxTermsPerClause?: number;
  must?: boolean;
}) {
  if (operator === 'AND') {
    if (must) {
      return {
        bool: {
          must: references.map(getNestedTermClauseForReference),
        },
      };
    }

    return {
      bool: {
        must_not: [
          {
            bool: {
              must: references.map(getNestedTermClauseForReference),
            },
          },
        ],
      },
    };
  } else {
    if (must) {
      return {
        bool: {
          should: getAggregatedTermsClauses(references, maxTermsPerClause),
          minimum_should_match: 1,
        },
      };
    }

    return {
      bool: {
        must_not: getAggregatedTermsClauses(references, maxTermsPerClause),
      },
    };
  }
}

const getAggregatedTermsClauses = (
  references: SavedObjectTypeIdTuple[],
  maxTermsPerClause: number
) => {
  const refTypeToIds = references.reduce((map, { type, id }) => {
    const ids = map.get(type) ?? [];
    map.set(type, [...ids, id]);
    return map;
  }, new Map<string, string[]>());

  // we create chunks per type to avoid generating `terms` clauses with too many terms
  const typeIdChunks = [...refTypeToIds.entries()].flatMap(([type, ids]) => {
    return createChunks(ids, maxTermsPerClause).map((chunkIds) => ({ type, ids: chunkIds }));
  });

  return typeIdChunks.map(({ type, ids }) => getNestedTermsClausesForReferences(type, ids));
};

const createChunks = <T>(array: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0, len = array.length; i < len; i += chunkSize)
    chunks.push(array.slice(i, i + chunkSize));
  return chunks;
};

export const getNestedTermClauseForReference = (reference: SavedObjectTypeIdTuple) => {
  return {
    nested: {
      path: 'references',
      query: {
        bool: {
          must: [
            {
              term: {
                'references.id': reference.id,
              },
            },
            {
              term: {
                'references.type': reference.type,
              },
            },
          ],
        },
      },
    },
  };
};

const getNestedTermsClausesForReferences = (type: string, ids: string[]) => {
  return {
    nested: {
      path: 'references',
      query: {
        bool: {
          must: [
            {
              terms: {
                'references.id': ids,
              },
            },
            {
              term: {
                'references.type': type,
              },
            },
          ],
        },
      },
    },
  };
};
