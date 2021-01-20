/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { groupBy, has } from 'lodash';
import { buildQueryFromKuery } from './from_kuery';
import { buildQueryFromFilters } from './from_filters';
import { buildQueryFromLucene } from './from_lucene';
import { IIndexPattern } from '../../index_patterns';
import { Filter } from '../filters';
import { Query } from '../../query/types';

export interface EsQueryConfig {
  allowLeadingWildcards: boolean;
  queryStringOptions: Record<string, any>;
  ignoreFilterIfFieldNotInIndex: boolean;
  dateFormatTZ?: string;
}

/**
 * @param indexPattern
 * @param queries - a query object or array of query objects. Each query has a language property and a query property.
 * @param filters - a filter object or array of filter objects
 * @param config - an objects with query:allowLeadingWildcards and query:queryString:options UI
 * settings in form of { allowLeadingWildcards, queryStringOptions }
 * config contains dateformat:tz
 */
export function buildEsQuery(
  indexPattern: IIndexPattern | undefined,
  queries: Query | Query[],
  filters: Filter | Filter[],
  config: EsQueryConfig = {
    allowLeadingWildcards: false,
    queryStringOptions: {},
    ignoreFilterIfFieldNotInIndex: false,
  }
) {
  queries = Array.isArray(queries) ? queries : [queries];
  filters = Array.isArray(filters) ? filters : [filters];

  const validQueries = queries.filter((query) => has(query, 'query'));
  const queriesByLanguage = groupBy(validQueries, 'language');
  const kueryQuery = buildQueryFromKuery(
    indexPattern,
    queriesByLanguage.kuery,
    config.allowLeadingWildcards,
    config.dateFormatTZ
  );
  const luceneQuery = buildQueryFromLucene(
    queriesByLanguage.lucene,
    config.queryStringOptions,
    config.dateFormatTZ
  );
  const filterQuery = buildQueryFromFilters(
    filters,
    indexPattern,
    config.ignoreFilterIfFieldNotInIndex
  );

  return {
    bool: {
      must: [...kueryQuery.must, ...luceneQuery.must, ...filterQuery.must],
      filter: [...kueryQuery.filter, ...luceneQuery.filter, ...filterQuery.filter],
      should: [...kueryQuery.should, ...luceneQuery.should, ...filterQuery.should],
      must_not: [...kueryQuery.must_not, ...luceneQuery.must_not, ...filterQuery.must_not],
    },
  };
}
