/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Reducer } from 'react';
import type { Filter } from '@kbn/es-query';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { Path } from './filter_editors_types';
import type { Operator } from '../../filter_bar/filter_editor/lib/filter_operators';
import type { ConditionTypes } from './filters_editor_condition_types';
import {
  addFilter,
  moveFilter,
  removeFilter,
  updateFilter,
  updateFilterField,
} from './filters_editor_utils';

/** @internal **/
export interface FiltersEditorState {
  filters: Filter[];
}

/** @internal **/
export interface AddFilterPayload {
  path: Path;
  filter: Filter;
  conditionalType: ConditionTypes;
}

/** @internal **/
export interface UpdateFilterPayload {
  dataView?: DataView;
  field?: DataViewField;
  operator?: Operator | undefined;
  params?: Filter['meta']['params'] | undefined;
  path: string;
}

/** @internal **/
export interface UpdateFilterFieldPayload {
  field?: DataViewField;
  path: string;
}

/** @internal **/
export interface RemoveFilterPayload {
  path: Path;
}

/** @internal **/
export interface MoveFilterPayload {
  pathFrom: Path;
  pathTo: Path;
  conditionalType: ConditionTypes;
}

/** @internal **/
export type FiltersEditorActions =
  | { type: 'addFilter'; payload: AddFilterPayload }
  | { type: 'updateFilter'; payload: UpdateFilterPayload }
  | { type: 'removeFilter'; payload: RemoveFilterPayload }
  | { type: 'moveFilter'; payload: MoveFilterPayload }
  | { type: 'updateFilterField'; payload: UpdateFilterFieldPayload };

export const filtersEditorReducer: Reducer<FiltersEditorState, FiltersEditorActions> = (
  state,
  action
) => {
  switch (action.type) {
    case 'addFilter':
      return {
        filters: addFilter(
          state.filters,
          action.payload.filter,
          action.payload.path,
          action.payload.conditionalType
        ),
      };
    case 'updateFilter':
      return {
        ...state,
        filters: updateFilter(
          state.filters,
          action.payload.path,
          action.payload.dataView,
          action.payload.field,
          action.payload.operator,
          action.payload.params
        ),
      };
    case 'updateFilterField':
      return {
        ...state,
        filters: updateFilterField(state.filters, action.payload.path, action.payload.field),
      };
    case 'removeFilter':
      return {
        ...state,
        filters: removeFilter(state.filters, action.payload.path),
      };
    case 'moveFilter':
      return {
        ...state,
        filters: moveFilter(
          state.filters,
          action.payload.pathFrom,
          action.payload.pathTo,
          action.payload.conditionalType
        ),
      };
    default:
      throw new Error('wrong action');
  }
};
