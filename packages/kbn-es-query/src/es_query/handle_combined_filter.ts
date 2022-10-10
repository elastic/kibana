/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter, FilterItem, isCombinedFilter } from '../filters';
import { DataViewBase } from './types';
import { buildQueryFromFilters, EsQueryFiltersConfig } from './from_filters';

/** @internal */
export const handleCombinedFilter = (
  filter: Filter,
  inputDataViews?: DataViewBase | DataViewBase[],
  options: EsQueryFiltersConfig = {}
): Filter => {
  if (!isCombinedFilter(filter)) return filter;
  const { params } = filter.meta;
  const should = params.map((subFilter) => {
    const subFilters = Array.isArray(subFilter) ? subFilter : [subFilter];
    return { bool: buildQueryFromFilters(flattenFilters(subFilters), inputDataViews, options) };
  });
  return {
    ...filter,
    query: {
      bool: {
        should,
        minimum_should_match: 1,
      },
    },
  };
};

function flattenFilters(filters: FilterItem[]): Filter[] {
  return filters.reduce<Filter[]>((result, filter) => {
    if (Array.isArray(filter)) return [...result, ...flattenFilters(filter)];
    return [...result, filter];
  }, []);
}
