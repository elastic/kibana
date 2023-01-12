/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewField } from '@kbn/data-views-plugin/public';

export interface FieldFilterState {
  type: string;
  name: string;
  aggregatable: null | boolean;
  searchable: null | boolean;
}

export function getDefaultFieldFilter(): FieldFilterState {
  return {
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
  if (name === 'aggregatable') {
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

export function doesFieldMatchFilters(
  field: DataViewField,
  filterState: FieldFilterState
): boolean {
  const matchFilter = filterState.type === 'any' || field.type === filterState.type;
  const isAggregatable =
    filterState.aggregatable === null || field.aggregatable === filterState.aggregatable;
  const isSearchable =
    filterState.searchable === null || field.searchable === filterState.searchable;
  const needle = filterState.name ? filterState.name.toLowerCase() : '';
  const haystack = `${field.name}${field.displayName || ''}`.toLowerCase();
  const matchName = !filterState.name || haystack.indexOf(needle) !== -1;

  return matchFilter && isAggregatable && isSearchable && matchName;
}
