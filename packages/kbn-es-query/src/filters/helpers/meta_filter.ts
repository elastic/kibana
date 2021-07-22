/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit, get } from 'lodash';
import { Filter, FilterStateStore } from '../build_filters';

export const isFilterPinned = (filter: Filter) => {
  return filter.$state && filter.$state.store === FilterStateStore.GLOBAL_STATE;
};

export const toggleFilterDisabled = (filter: Filter) => {
  const disabled = !filter.meta.disabled;
  const meta = { ...filter.meta, disabled };

  return { ...filter, meta };
};

export const toggleFilterNegated = (filter: Filter) => {
  const negate = !filter.meta.negate;
  const meta = { ...filter.meta, negate };

  return { ...filter, meta };
};

export const toggleFilterPinned = (filter: Filter) => {
  const store = isFilterPinned(filter) ? FilterStateStore.APP_STATE : FilterStateStore.GLOBAL_STATE;
  const $state = { ...filter.$state, store };

  return { ...filter, $state };
};

export const enableFilter = (filter: Filter) =>
  !filter.meta.disabled ? filter : toggleFilterDisabled(filter);

export const disableFilter = (filter: Filter) =>
  filter.meta.disabled ? filter : toggleFilterDisabled(filter);

export const pinFilter = (filter: Filter) =>
  isFilterPinned(filter) ? filter : toggleFilterPinned(filter);

export const unpinFilter = (filter: Filter) =>
  !isFilterPinned(filter) ? filter : toggleFilterPinned(filter);

export const isFilter = (x: unknown): x is Filter =>
  !!x &&
  typeof x === 'object' &&
  !!(x as Filter).meta &&
  typeof (x as Filter).meta === 'object' &&
  typeof (x as Filter).meta.disabled === 'boolean';

export const isFilters = (x: unknown): x is Filter[] =>
  Array.isArray(x) && !x.find((y) => !isFilter(y));

/**
 * Clean out any invalid attributes from the filters
 * @param {object} filter The filter to clean
 * @returns {object}
 */
export const cleanFilter = (filter: Filter): Filter => omit(filter, ['meta', '$state']) as Filter;

export const isFilterDisabled = (filter: Filter): boolean => get(filter, 'meta.disabled', false);
