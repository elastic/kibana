/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { groupBy, has, isEqual } from 'lodash';
import { SerializableRecord } from '@kbn/utility-types';
import { buildQueryFromKuery } from './from_kuery';
import { buildQueryFromFilters } from './from_filters';
import { buildQueryFromLucene } from './from_lucene';
import { Filter, Query, AggregateQuery } from '../filters';
import { isOfQueryType } from './es_query_sql';
import { BoolQuery, DataViewBase } from './types';
import type { KueryQueryOptions } from '../kuery';
import type { EsQueryFiltersConfig } from './from_filters';

type AnyQuery = Query | AggregateQuery;
/**
 * Configurations to be used while constructing an ES query.
 * @public
 */
export type EsQueryConfig = KueryQueryOptions &
  EsQueryFiltersConfig & {
    allowLeadingWildcards?: boolean;
    queryStringOptions?: SerializableRecord;
  };

function removeMatchAll<T>(filters: T[]) {
  return filters.filter(
    (filter) => !filter || typeof filter !== 'object' || !isEqual(filter, { match_all: {} })
  );
}

/**
 * @param indexPattern
 * @param queries - a query object or array of query objects. Each query has a language property and a query property.
 * @param filters - a filter object or array of filter objects
 * @param config - an objects with query:allowLeadingWildcards and query:queryString:options UI
 * settings in form of { allowLeadingWildcards, queryStringOptions }
 * config contains dateformat:tz
 *
 * @public
 */
export function buildEsQuery(
  indexPattern: DataViewBase | DataViewBase[] | undefined,
  queries: AnyQuery | AnyQuery[],
  filters: Filter | Filter[],
  config: EsQueryConfig = {
    allowLeadingWildcards: false,
    queryStringOptions: {},
    ignoreFilterIfFieldNotInIndex: false,
  }
): { bool: BoolQuery } {
  queries = Array.isArray(queries) ? queries : [queries];
  filters = Array.isArray(filters) ? filters : [filters];

  const validQueries = queries.filter(isOfQueryType).filter((query) => has(query, 'query'));
  const queriesByLanguage = groupBy(validQueries, 'language');
  const kueryQuery = buildQueryFromKuery(
    Array.isArray(indexPattern) ? indexPattern[0] : indexPattern,
    queriesByLanguage.kuery,
    { allowLeadingWildcards: config.allowLeadingWildcards },
    {
      dateFormatTZ: config.dateFormatTZ,
      filtersInMustClause: config.filtersInMustClause,
      nestedIgnoreUnmapped: config.nestedIgnoreUnmapped,
      caseInsensitive: config.caseInsensitive,
    }
  );
  const luceneQuery = buildQueryFromLucene(
    queriesByLanguage.lucene,
    config.queryStringOptions,
    config.dateFormatTZ
  );

  const filterQuery = buildQueryFromFilters(filters, indexPattern, {
    ignoreFilterIfFieldNotInIndex: config.ignoreFilterIfFieldNotInIndex,
    nestedIgnoreUnmapped: config.nestedIgnoreUnmapped,
  });

  return {
    bool: {
      must: removeMatchAll([...kueryQuery.must, ...luceneQuery.must, ...filterQuery.must]),
      filter: removeMatchAll([...kueryQuery.filter, ...luceneQuery.filter, ...filterQuery.filter]),
      should: removeMatchAll([...kueryQuery.should, ...luceneQuery.should, ...filterQuery.should]),
      must_not: [...kueryQuery.must_not, ...luceneQuery.must_not, ...filterQuery.must_not],
    },
  };
}
