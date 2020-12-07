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

import { IndexPatternField } from '../../../../../../data/public';

export interface FieldFilterState {
  missing: boolean;
  type: string;
  name: string;
  aggregatable: null | boolean;
  searchable: null | boolean;
}

export function getDefaultFieldFilter(): FieldFilterState {
  return {
    missing: true,
    type: 'any',
    name: '',
    aggregatable: null,
    searchable: null,
  };
}

export function setFieldFilterProp(
  state: FieldFilterState,
  name: string,
  value: string | boolean | null | undefined
): FieldFilterState {
  const newState = { ...state };
  if (name === 'missing') {
    newState.missing = Boolean(value);
  } else if (name === 'aggregatable') {
    newState.aggregatable = typeof value !== 'boolean' ? null : value;
  } else if (name === 'searchable') {
    newState.searchable = typeof value !== 'boolean' ? null : value;
  } else if (name === 'name') {
    newState.name = String(value);
  } else if (name === 'type') {
    newState.type = String(value);
  }
  return newState;
}

export function isFieldFiltered(
  field: IndexPatternField,
  filterState: FieldFilterState,
  fieldCounts: Record<string, number>
): boolean {
  const matchFilter = filterState.type === 'any' || field.type === filterState.type;
  const isAggregatable =
    filterState.aggregatable === null || field.aggregatable === filterState.aggregatable;
  const isSearchable =
    filterState.searchable === null || field.searchable === filterState.searchable;
  const scriptedOrMissing =
    !filterState.missing ||
    field.type === '_source' ||
    field.scripted ||
    fieldCounts[field.name] > 0;
  const needle = filterState.name ? filterState.name.toLowerCase() : '';
  const haystack = `${field.name}${field.displayName || ''}`.toLowerCase();
  const matchName = !filterState.name || haystack.indexOf(needle) !== -1;

  return matchFilter && isAggregatable && isSearchable && scriptedOrMissing && matchName;
}
