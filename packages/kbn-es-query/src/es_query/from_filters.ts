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
import { handleNestedFilter } from './handle_nested_filter';

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
 * @param filters
 * @param indexPattern
 * @param ignoreFilterIfFieldNotInIndex by default filters that use fields that can't be found in the specified index pattern are not applied. Set this to true if you want to apply them anyway.
 * @returns An EQL query
 *
 * @public
 */
export const buildQueryFromFilters = (
  filters: Filter[] = [],
  indexPattern: DataViewBase | undefined,
  ignoreFilterIfFieldNotInIndex: boolean = false
): BoolQuery => {
  filters = filters.filter((filter) => filter && !isFilterDisabled(filter));

  const filtersToESQueries = (negate: boolean) => {
    return filters
      .filter((f) => !!f)
      .filter(filterNegate(negate))
      .filter(
        (filter) => !ignoreFilterIfFieldNotInIndex || filterMatchesIndex(filter, indexPattern)
      )
      .map((filter) => {
        return migrateFilter(filter, indexPattern);
      })
      .map((filter) => handleNestedFilter(filter, indexPattern))
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
