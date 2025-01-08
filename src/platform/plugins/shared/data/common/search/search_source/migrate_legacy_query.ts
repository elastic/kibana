/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Query, AggregateQuery, isOfAggregateQueryType } from '@kbn/es-query';
import { has } from 'lodash';

/**
 * Creates a standardized query object from old queries that were either strings or pure ES query DSL
 *
 * @param query - a legacy query, what used to be stored in SearchSource's query property
 * @return Object
 */

export function migrateLegacyQuery(
  query: Query | { [key: string]: any } | string | AggregateQuery
): Query | AggregateQuery {
  // Lucene was the only option before, so language-less queries are all lucene
  // If the query is already a AggregateQuery, just return it
  if (!has(query, 'language')) {
    if (typeof query === 'object' && isOfAggregateQueryType(query)) {
      return query;
    }
    return { query, language: 'lucene' };
  }

  return query as Query;
}
