/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

export enum FilterStateStore {
  APP_STATE = 'appState',
  GLOBAL_STATE = 'globalState',
}

export interface FilterState {
  store: FilterStateStore;
}

type FilterFormatterFunction = (value: any) => string;
export interface FilterValueFormatter {
  convert: FilterFormatterFunction;
  getConverterFor: (type: string) => FilterFormatterFunction;
}

export interface FilterMeta {
  alias: string | null;
  disabled: boolean;
  negate: boolean;
  // controlledBy is there to identify who owns the filter
  controlledBy?: string;
  // index and type are optional only because when you create a new filter, there are no defaults
  index?: string;
  type?: string;
  key?: string;
  params?: any;
  value?: string | ((formatter?: FilterValueFormatter) => string);
}

export interface Filter {
  $state?: FilterState;
  meta: FilterMeta;
  query?: any;
}

export interface LatLon {
  lat: number;
  lon: number;
}

export const buildEmptyFilter = (isPinned: boolean, index?: string): Filter => {
  const meta: FilterMeta = {
    disabled: false,
    negate: false,
    alias: null,
    index,
  };
  const $state: FilterState = {
    store: isPinned ? FilterStateStore.GLOBAL_STATE : FilterStateStore.APP_STATE,
  };

  return { meta, $state };
};

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
