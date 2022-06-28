/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { AggregateQuery, Query } from '@kbn/es-query';

function isOfAggregateQueryType(query: AggregateQuery | Query): query is AggregateQuery {
  return Boolean(query && 'sql' in query);
}

function getAggregateQueryMode(query: AggregateQuery): string {
  return Object.keys(query)[0];
}

export function getTextBasedLanguageMode(query: Query | AggregateQuery): string {
  let textBasedLanguageMode = '';
  if (query && isOfAggregateQueryType(query)) {
    const aggregatedQuery = query as AggregateQuery;
    textBasedLanguageMode = getAggregateQueryMode(aggregatedQuery);
  }
  return textBasedLanguageMode;
}
