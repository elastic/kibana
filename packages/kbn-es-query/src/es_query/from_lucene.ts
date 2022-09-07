/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SerializableRecord } from '@kbn/utility-types';
import { Query } from '../..';
import { decorateQuery } from './decorate_query';
import { luceneStringToDsl } from './lucene_string_to_dsl';
import { BoolQuery } from './types';

/** @internal */
export function buildQueryFromLucene(
  queries: Query[],
  queryStringOptions: SerializableRecord = {},
  dateFormatTZ?: string
): BoolQuery {
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
