/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { migrateFilter } from './migrate_filter';
import { filterMatchesIndex } from './filter_matches_index';
import { Filter, isFilterDisabled, isExistsFilter, cleanFilter, toExistsEsQuery } from '../filters';
import { BoolQuery, DataViewBase } from './types';
import { handleNestedFilter } from './handle_nested_filter';

/**
 * Options for building query for filters
 */
export interface EsQueryFiltersConfig {
  /**
   * by default filters that use fields that can't be found in the specified index pattern are not applied. Set this to true if you want to apply them anyway.
   */
  ignoreFilterIfFieldNotInIndex?: boolean;

  /**
   * the nested field type requires a special query syntax, which includes an optional ignore_unmapped parameter that indicates whether to ignore an unmapped path and not return any documents instead of an error.
   * The optional ignore_unmapped parameter defaults to false.
   * This `nestedIgnoreUnmapped` param allows creating queries with "ignore_unmapped": true
   */
  nestedIgnoreUnmapped?: boolean;
}

/**
 * @param filters
 * @param indexPattern
 * @param ignoreFilterIfFieldNotInIndex by default filters that use fields that can't be found in the specified index pattern are not applied. Set this to true if you want to apply them anyway.
 * @returns An EQL query
 *
 * @public
 */
export const buildQueryFromFilters = (
  allFilters: Filter[] = [],
  dataView: DataViewBase | DataViewBase[] | undefined,
  config: EsQueryFiltersConfig = {}
): BoolQuery => {
  const { ignoreFilterIfFieldNotInIndex = false, nestedIgnoreUnmapped } = config;
  const filters = allFilters.filter((filter) => !isFilterDisabled(filter));

  const filtersToESQueries = (negate: boolean): QueryDslQueryContainer[] => {
    return filters
      .filter((filter) => !!filter.meta?.negate === negate)
      .filter((filter) => {
        const indexPattern = findIndexPattern(filter, dataView, filter.meta.index);
        return !ignoreFilterIfFieldNotInIndex || filterMatchesIndex(filter, indexPattern);
      })
      .map((filter) => {
        const indexPattern = findIndexPattern(filter, dataView, filter.meta.index);
        const migratedFilter = migrateFilter(filter, indexPattern);
        return handleNestedFilter(migratedFilter, indexPattern, {
          ignoreUnmapped: nestedIgnoreUnmapped,
        });
      })
      .map((filter) => filterToEsQuery(filter));
  };

  return {
    must: [],
    filter: filtersToESQueries(false),
    should: [],
    must_not: filtersToESQueries(true),
  };
};

export function filterToEsQuery(filter: Filter): QueryDslQueryContainer {
  if (isExistsFilter(filter)) {
    return toExistsEsQuery(filter);
  } else {
    return filter.query ?? cleanFilter(filter);
  }
}

function findIndexPattern(filter: Filter, dataView?: DataViewBase | DataViewBase[], id?: string) {
  const dataViews = Array.isArray(dataView) ? dataView : dataView != null ? [dataView] : [];
  return dataViews.find((index) => index?.id === id) || dataViews[0];
}
