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
  type: string;
  disabled: boolean;
  negate: boolean;
  alias: string | null;
  index: string;
}

export interface MetaFilter {
  $state: FilterState;
  meta: FilterMeta;
  query?: any;
}

export interface LatLon {
  lat: number;
  lon: number;
}

export function isFilterPinned(filter: MetaFilter) {
  return filter.$state.store === FilterStateStore.GLOBAL_STATE;
}

export function toggleFilterDisabled(filter: MetaFilter) {
  const disabled = !filter.meta.disabled;
  const meta = { ...filter.meta, disabled };
  return { ...filter, meta };
}

export function toggleFilterNegated(filter: MetaFilter) {
  const negate = !filter.meta.negate;
  const meta = { ...filter.meta, negate };
  return { ...filter, meta };
}

export function toggleFilterPinned(filter: MetaFilter) {
  const store = isFilterPinned(filter) ? FilterStateStore.APP_STATE : FilterStateStore.GLOBAL_STATE;
  const $state = { ...filter.$state, store };
  return { ...filter, $state };
}

export function enableFilter(filter: MetaFilter) {
  return !filter.meta.disabled ? filter : toggleFilterDisabled(filter);
}

export function disableFilter(filter: MetaFilter) {
  return filter.meta.disabled ? filter : toggleFilterDisabled(filter);
}

export function pinFilter(filter: MetaFilter) {
  return isFilterPinned(filter) ? filter : toggleFilterPinned(filter);
}

export function unpinFilter(filter: MetaFilter) {
  return !isFilterPinned(filter) ? filter : toggleFilterPinned(filter);
}
