/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isUndefined } from 'lodash';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { migrateFilter } from './migrate_filter';
import { filterMatchesIndex } from './filter_matches_index';
import { Filter, cleanFilter, isFilterDisabled } from '../filters';
import { BoolQuery, DataViewBase } from './types';
import { fromNestedFilter } from './from_nested_filter';
import { fromCombinedFilter } from './from_combined_filter';

/**
 * Create a filter that can be reversed for filters with negate set
 * @param {boolean} reverse This will reverse the filter. If true then
 *                          anything where negate is set will come
 *                          through otherwise it will filter out
 * @returns {function}
 */
const filterNegate = (reverse: boolean) => (filter: Filter) => {
  if (isUndefined(filter.meta) || isUndefined(filter.meta.negate)) {
    return !reverse;
  }

  return filter.meta && filter.meta.negate === reverse;
};

/**
 * Translate a filter into a query to support es 5+
 * @param  {Object} filter - The filter to translate
 * @return {Object} the query version of that filter
 */
const translateToQuery = (filter: Partial<Filter>): estypes.QueryDslQueryContainer => {
  return filter.query || filter;
};

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
  inputFilters: Filter[] = [],
  inputDataViews: DataViewBase | DataViewBase[] | undefined,
  options: EsQueryFiltersConfig = {
    ignoreFilterIfFieldNotInIndex: false,
  }
): BoolQuery => {
  const { ignoreFilterIfFieldNotInIndex = false, nestedIgnoreUnmapped } = options;
  const filters = inputFilters.filter((filter) => filter && !isFilterDisabled(filter));
  const indexPatterns = Array.isArray(inputDataViews) ? inputDataViews : [inputDataViews];

  const findIndexPattern = (id: string | undefined) => {
    return indexPatterns.find((index) => index?.id === id) || indexPatterns[0];
  };

  const filtersToESQueries = (negate: boolean) => {
    return filters
      .filter((f) => !!f)
      .filter(filterNegate(negate))
      .filter((filter) => {
        const indexPattern = findIndexPattern(filter.meta?.index);
        return !ignoreFilterIfFieldNotInIndex || filterMatchesIndex(filter, indexPattern);
      })
      .map((filter) => {
        const indexPattern = findIndexPattern(filter.meta?.index);
        const migratedFilter = migrateFilter(filter, indexPattern);
        return fromNestedFilter(migratedFilter, indexPattern, {
          ignoreUnmapped: nestedIgnoreUnmapped,
        });
      })
      .map((filter) => fromCombinedFilter(filter, inputDataViews, options))
      .map(cleanFilter)
      .map(translateToQuery);
  };

  return {
    must: [],
    filter: filtersToESQueries(false),
    should: [],
    must_not: filtersToESQueries(true),
  };
};
