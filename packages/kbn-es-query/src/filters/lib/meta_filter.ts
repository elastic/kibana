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

export interface FilterMeta {
  // index and type are optional only because when you create a new filter, there are no defaults
  index?: string;
  type?: string;
  disabled: boolean;
  negate: boolean;
  alias: string | null;
  key?: string;
  value?: string;
}

export interface Filter {
  $state: FilterState;
  meta: FilterMeta;
  query?: object;
}

export interface LatLon {
  lat: number;
  lon: number;
}

export function buildEmptyFilter(isPinned: boolean, index?: string): Filter {
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
}

export function isFilterPinned(filter: Filter) {
  return filter.$state.store === FilterStateStore.GLOBAL_STATE;
}

export function toggleFilterDisabled(filter: Filter) {
  const disabled = !filter.meta.disabled;
  const meta = { ...filter.meta, disabled };
  return { ...filter, meta };
}

export function toggleFilterNegated(filter: Filter) {
  const negate = !filter.meta.negate;
  const meta = { ...filter.meta, negate };
  return { ...filter, meta };
}

export function toggleFilterPinned(filter: Filter) {
  const store = isFilterPinned(filter) ? FilterStateStore.APP_STATE : FilterStateStore.GLOBAL_STATE;
  const $state = { ...filter.$state, store };
  return { ...filter, $state };
}

export function enableFilter(filter: Filter) {
  return !filter.meta.disabled ? filter : toggleFilterDisabled(filter);
}

export function disableFilter(filter: Filter) {
  return filter.meta.disabled ? filter : toggleFilterDisabled(filter);
}

export function pinFilter(filter: Filter) {
  return isFilterPinned(filter) ? filter : toggleFilterPinned(filter);
}

export function unpinFilter(filter: Filter) {
  return !isFilterPinned(filter) ? filter : toggleFilterPinned(filter);
}
