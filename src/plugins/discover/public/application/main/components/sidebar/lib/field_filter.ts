/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewField } from '../../../../../../../data_views/public';

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
  field: DataViewField,
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
    field.type === 'unknown_selected' ||
    field.scripted ||
    fieldCounts[field.name] > 0;
  const needle = filterState.name ? filterState.name.toLowerCase() : '';
  const haystack = `${field.name}${field.displayName || ''}`.toLowerCase();
  const matchName = !filterState.name || haystack.indexOf(needle) !== -1;

  return matchFilter && isAggregatable && isSearchable && scriptedOrMissing && matchName;
}
