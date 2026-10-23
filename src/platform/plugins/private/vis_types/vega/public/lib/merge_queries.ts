/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { decorateQuery, luceneStringToDsl, type EsQueryConfig } from '@kbn/es-query';
import type { VegaByValueState } from '../../server';

type VegaQuery = VegaByValueState['query'];
type VegaFilter = NonNullable<VegaByValueState['filters']>[number];

const isSet = (query: VegaQuery): query is NonNullable<VegaQuery> =>
  Boolean(query?.expression.trim());

const AND = { kql: 'and', lucene: 'AND' } as const;

/**
 * When a panel is unlinked from the library, the library item query must be merged with a panel query
 * otherwise the conversion is lossy. So this fixes that edge case by combining the library item
 * query with a panel query into a single query for the by-value panel.
 * Queries in the same language are joined with `and`. When the languages differ, the KQL query is
 * kept and the Lucene one is returned as a `query_string` filter, so nothing has to be converted
 * from KQL. The filter gets the query string options a Lucene query gets when it is rendered.
 */
export const mergeQueries = (
  libraryQuery: VegaQuery,
  panelQuery: VegaQuery,
  { queryStringOptions = {}, dateFormatTZ }: EsQueryConfig
): { query: VegaQuery; filters: VegaFilter[] } => {
  if (!isSet(libraryQuery) || !isSet(panelQuery)) {
    return { query: [libraryQuery, panelQuery].find(isSet), filters: [] };
  }

  if (libraryQuery.language === panelQuery.language) {
    return {
      query: {
        language: libraryQuery.language,
        expression: `(${libraryQuery.expression}) ${AND[libraryQuery.language]} (${
          panelQuery.expression
        })`,
      },
      filters: [],
    };
  }

  const [kqlQuery, luceneQuery] =
    libraryQuery.language === 'kql' ? [libraryQuery, panelQuery] : [panelQuery, libraryQuery];
  return {
    query: kqlQuery,
    filters: [
      {
        type: 'dsl',
        dsl: {
          query: decorateQuery(
            luceneStringToDsl(luceneQuery.expression),
            queryStringOptions,
            dateFormatTZ
          ),
        },
      },
    ],
  };
};
