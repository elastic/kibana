/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { isUndefined } from 'lodash';
import { migrateFilter } from './migrate_filter';
import { filterMatchesIndex } from './filter_matches_index';
import { Filter, cleanFilter, isFilterDisabled } from '../filters';
import { IIndexPattern } from '../../index_patterns';
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
const translateToQuery = (filter: Filter) => {
  if (!filter) return;

  if (filter.query) {
    return filter.query;
  }

  return filter;
};

export const buildQueryFromFilters = (
  filters: Filter[] = [],
  indexPattern: IIndexPattern | undefined,
  ignoreFilterIfFieldNotInIndex: boolean = false
) => {
  filters = filters.filter((filter) => filter && !isFilterDisabled(filter));

  const filtersToESQueries = (negate: boolean) => {
    return filters
      .filter(filterNegate(negate))
      .filter(
        (filter) => !ignoreFilterIfFieldNotInIndex || filterMatchesIndex(filter, indexPattern)
      )
      .map((filter) => {
        return migrateFilter(filter, indexPattern);
      })
      .map((filter) => handleNestedFilter(filter, indexPattern))
      .map(translateToQuery)
      .map(cleanFilter);
  };

  return {
    must: [],
    filter: filtersToESQueries(false),
    should: [],
    must_not: filtersToESQueries(true),
  };
};
