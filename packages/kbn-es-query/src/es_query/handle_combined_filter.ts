/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter, isCombinedFilter } from '../filters';
import { DataViewBase } from './types';
import { buildQueryFromFilters, EsQueryFiltersConfig } from './from_filters';
import { BooleanRelation } from '../filters/build_filters';

/** @internal */
export const handleCombinedFilter = (
  filter: Filter,
  inputDataViews?: DataViewBase | DataViewBase[],
  options: EsQueryFiltersConfig = {}
): Filter => {
  if (!isCombinedFilter(filter)) return filter;
  const { params } = filter.meta;

  if (filter.meta.relation === BooleanRelation.AND) {
    const bool = buildQueryFromFilters(filter.meta.params, inputDataViews, options);
    return { ...filter, query: { bool } };
  }

  const should = params.map((subFilter) => ({
    bool: buildQueryFromFilters([subFilter], inputDataViews, options),
  }));
  const bool = { should, minimum_should_match: 1 };
  return { ...filter, query: { bool } };
};
