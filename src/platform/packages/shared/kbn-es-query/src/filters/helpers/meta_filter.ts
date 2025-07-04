/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit, get } from 'lodash';
import { Filter, FilterStateStore } from '../build_filters';

/**
 *
 * @param filter
 * @returns `true` if the filter should be applied to global scope
 *
 * @public
 */
export const isFilterPinned = (filter: Filter) => {
  return filter.$state && filter.$state.store === FilterStateStore.GLOBAL_STATE;
};

/**
 * @param filter
 * @returns `true` if the filter is disabled
 *
 * @public
 */
export const isFilterDisabled = (filter: Filter): boolean => get(filter, 'meta.disabled', false);

/**
 *
 * @param filter
 * @returns A copy of the filter with a toggled disabled state
 *
 * @public
 */
export const toggleFilterDisabled = (filter: Filter) => {
  const disabled = !filter.meta.disabled;
  const meta = { ...filter.meta, disabled };

  return { ...filter, meta };
};

/**
 *
 * @param filter
 * @returns A copy of the filter with a toggled negated state
 *
 * @public
 */
export const toggleFilterNegated = (filter: Filter) => {
  const negate = !filter.meta.negate;
  const meta = { ...filter.meta, negate };

  return { ...filter, meta };
};

/**
 *
 * @param filter
 * @returns A copy of the filter with a toggled pinned state (toggles store from app to global and vice versa)
 *
 * @public
 */
export const toggleFilterPinned = (filter: Filter) => {
  const store = isFilterPinned(filter) ? FilterStateStore.APP_STATE : FilterStateStore.GLOBAL_STATE;
  const $state = { ...filter.$state, store };

  return { ...filter, $state };
};

/**
 * @param filter
 * @returns An enabled copy of the filter
 *
 * @public
 */
export const enableFilter = (filter: Filter) =>
  !filter.meta.disabled ? filter : toggleFilterDisabled(filter);

/**
 * @param filter
 * @returns A disabled copy of the filter
 *
 * @public
 */
export const disableFilter = (filter: Filter) =>
  filter.meta.disabled ? filter : toggleFilterDisabled(filter);

/**
 * @param filter
 * @returns A pinned (global) copy of the filter
 *
 * @public
 */
export const pinFilter = (filter: Filter) =>
  isFilterPinned(filter) ? filter : toggleFilterPinned(filter);

/**
 * @param filter
 * @returns An unpinned (app scoped) copy of the filter
 *
 * @public
 */
export const unpinFilter = (filter: Filter) =>
  !isFilterPinned(filter) ? filter : toggleFilterPinned(filter);

/**
 * @param {unknown} filter
 * @returns `true` if the given object is a filter
 *
 * @public
 */
export const isFilter = (x: unknown): x is Filter =>
  !!x && typeof x === 'object' && !!(x as Filter).meta && typeof (x as Filter).meta === 'object';

/**
 * @param {unknown} filters
 * @returns `true` if the given object is an array of filters
 *
 * @public
 */
export const isFilters = (x: unknown): x is Filter[] =>
  Array.isArray(x) && !x.find((y) => !isFilter(y));

/**
 * Clean out decorators from the filters
 * @param {object} filter The filter to clean
 * @returns {object}
 *
 * @public
 */
export const cleanFilter = (filter: Filter): Partial<Filter> => omit(filter, ['meta', '$state']);
