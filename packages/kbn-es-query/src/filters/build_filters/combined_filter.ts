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
 * @public
 */
export enum BooleanRelation {
  AND = 'AND',
  OR = 'OR',
}

/**
 * @public
 */
export interface CombinedFilterMeta extends FilterMeta {
  type: typeof FILTERS.COMBINED;
  relation: BooleanRelation;
  params: Filter[];
}

/**
 * @public
 */
export interface CombinedFilter extends Filter {
  meta: CombinedFilterMeta;
}

/**
 * @public
 */
export function isCombinedFilter(filter: Filter): filter is CombinedFilter {
  return filter?.meta?.type === FILTERS.COMBINED;
}

/**
 * Builds an COMBINED filter. An COMBINED filter is a filter with multiple sub-filters. Each sub-filter (FilterItem)
 * represents a condition.
 * @param relation The type of relation with which to combine the filters (AND/OR)
 * @param filters An array of sub-filters
 * @public
 */
export function buildCombinedFilter(
  relation: BooleanRelation,
  filters: Filter[],
  alias?: string | null
): CombinedFilter {
  const filter = buildEmptyFilter(false);
  return {
    ...filter,
    meta: {
      ...filter.meta,
      type: FILTERS.COMBINED,
      relation,
      alias,
      params: filters,
    },
  };
}
