/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter, FilterMeta, FILTERS } from './types';
import { buildEmptyFilter } from './build_empty_filter';

/**
 * Each item in an OR filter may represent either one filter (to be ORed) or an array of filters (ANDed together before
 * becoming part of the OR clause).
 * @public
 */
export type FilterItem = Filter | FilterItem[];

/**
 * @public
 */
export interface OrFilterMeta extends FilterMeta {
  type: typeof FILTERS.OR;
  params: FilterItem[];
}

/**
 * @public
 */
export interface OrFilter extends Filter {
  meta: OrFilterMeta;
}

/**
 * @public
 */
export function isOrFilter(filter: Filter): filter is OrFilter {
  return filter?.meta?.type === FILTERS.OR;
}

/**
 * Builds an OR filter. An OR filter is a filter with multiple sub-filters. Each sub-filter (FilterItem) represents a
 * condition.
 * @param filters An array of OrFilterItem
 * @public
 */
export function buildOrFilter(filters: FilterItem[]): OrFilter {
  const filter = buildEmptyFilter(false);
  return {
    ...filter,
    meta: {
      ...filter.meta,
      type: FILTERS.OR,
      params: filters,
    },
  };
}
