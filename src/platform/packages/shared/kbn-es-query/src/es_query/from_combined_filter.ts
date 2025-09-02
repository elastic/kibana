/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '../filters';
import { isCombinedFilter } from '../filters';
import type { DataViewBase } from './types';
import type { EsQueryFiltersConfig } from './from_filters';
import { buildQueryFromFilters } from './from_filters';
import type { CombinedFilter } from '../filters/build_filters';
import { BooleanRelation } from '../filters/build_filters';

const fromAndFilter = (
  filter: CombinedFilter,
  dataViews?: DataViewBase | DataViewBase[],
  options: EsQueryFiltersConfig = {}
) => {
  const bool = buildQueryFromFilters(filter.meta.params, dataViews, options);
  return { ...filter, query: { bool } };
};

const fromOrFilter = (
  filter: CombinedFilter,
  dataViews?: DataViewBase | DataViewBase[],
  options: EsQueryFiltersConfig = {}
) => {
  const should = filter.meta.params.map((subFilter) => ({
    bool: buildQueryFromFilters([subFilter], dataViews, options),
  }));
  const bool = { should, minimum_should_match: 1 };
  return { ...filter, query: { bool } };
};

export const fromCombinedFilter = (
  filter: Filter,
  dataViews?: DataViewBase | DataViewBase[],
  options: EsQueryFiltersConfig = {}
): Filter => {
  if (!isCombinedFilter(filter)) {
    return filter;
  }

  if (filter.meta.relation === BooleanRelation.AND) {
    return fromAndFilter(filter, dataViews, options);
  }

  return fromOrFilter(filter, dataViews, options);
};
