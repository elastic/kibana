/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { HasReferenceQueryParams, SearchOperator } from './query_params';

export function getReferencesFilter({
  references,
  operator = 'OR',
  maxTermsPerClause = 1000,
}: {
  references: HasReferenceQueryParams[];
  operator?: SearchOperator;
  maxTermsPerClause?: number;
}) {
  if (operator === 'AND') {
    return {
      bool: {
        must: references.map(getNestedTermClauseForReference),
      },
    };
  } else {
    return {
      bool: {
        should: getAggregatedTermsClauses(references, maxTermsPerClause),
        minimum_should_match: 1,
      },
    };
  }
}

const getAggregatedTermsClauses = (
  references: HasReferenceQueryParams[],
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

export const getNestedTermClauseForReference = (reference: HasReferenceQueryParams) => {
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
