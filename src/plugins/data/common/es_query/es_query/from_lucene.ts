/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { decorateQuery } from './decorate_query';
import { luceneStringToDsl } from './lucene_string_to_dsl';
import { Query } from '../../query/types';

export function buildQueryFromLucene(
  queries: Query[],
  queryStringOptions: Record<string, any>,
  dateFormatTZ?: string
) {
  const combinedQueries = (queries || []).map((query) => {
    const queryDsl = luceneStringToDsl(query.query);

    return decorateQuery(queryDsl, queryStringOptions, dateFormatTZ);
  });

  return {
    must: combinedQueries,
    filter: [],
    should: [],
    must_not: [],
  };
}
