/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Reducer } from 'react';
import type { Filter, BooleanRelation } from '@kbn/es-query';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { addFilter, moveFilter, removeFilter, updateFilters } from './utils';
import type { Operator } from '../filter_bar/filter_editor';
import { FilterLocation } from './types';

/** @internal **/
export interface FiltersBuilderState {
  filters: Filter[];
}

/** @internal **/
export interface UpdateFiltersPayload {
  filters: Filter[];
}

/** @internal **/
export interface AddFilterPayload {
  dest: FilterLocation;
  filter: Filter;
  booleanRelation: BooleanRelation;
  dataView: DataView;
}

/** @internal **/
export interface UpdateFilterPayload {
  dest: FilterLocation;
  field?: DataViewField;
  operator?: Operator;
  params?: Filter['meta']['params'];
}

/** @internal **/
export interface RemoveFilterPayload {
  dest: FilterLocation;
}

/** @internal **/
export interface MoveFilterPayload {
  from: FilterLocation;
  to: FilterLocation;
  booleanRelation: BooleanRelation;
  dataView: DataView;
}

/** @internal **/
export type FiltersBuilderActions =
  | { type: 'updateFilters'; payload: UpdateFiltersPayload }
  | { type: 'addFilter'; payload: AddFilterPayload }
  | { type: 'removeFilter'; payload: RemoveFilterPayload }
  | { type: 'moveFilter'; payload: MoveFilterPayload }
  | { type: 'updateFilter'; payload: UpdateFilterPayload };

export const FiltersBuilderReducer: Reducer<FiltersBuilderState, FiltersBuilderActions> = (
  state,
  action
) => {
  switch (action.type) {
    case 'updateFilters':
      return {
        ...state,
        filters: action.payload.filters,
      };
    case 'addFilter':
      return {
        ...state,
        filters: addFilter(
          state.filters,
          action.payload.filter,
          action.payload.dest,
          action.payload.booleanRelation,
          action.payload.dataView
        ),
      };
    case 'removeFilter':
      return {
        ...state,
        filters: removeFilter(state.filters, action.payload.dest),
      };
    case 'moveFilter':
      return {
        ...state,
        filters: moveFilter(
          state.filters,
          action.payload.from,
          action.payload.to,
          action.payload.booleanRelation,
          action.payload.dataView
        ),
      };
    case 'updateFilter':
      return {
        ...state,
        filters: updateFilters(
          state.filters,
          action.payload.dest,
          action.payload.field,
          action.payload.operator,
          action.payload.params
        ),
      };
    default:
      throw new Error('wrong action');
  }
};
