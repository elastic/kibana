/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Reducer } from 'react';
import type { Filter } from '@kbn/es-query';
import { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { Path } from './filter_editors_types';
import { Operator } from '../../filter_bar/filter_editor/lib/filter_operators';
import { ConditionTypes } from './filters_editor_condition_types';
import { addFilter, removeFilter, updateFilterItem } from './filters_editor_utils';

/** @internal **/
export interface FiltersEditorState {
  filters: Filter[];
}

/** @internal **/
export interface AddFilterPayload {
  path: Path;
  dataViewId: string | undefined;
  conditionalType: ConditionTypes;
}

/** @internal **/
export interface UpdateFiltersPayload {
  dataView: DataView;
  field?: DataViewField | undefined;
  operator?: Operator | undefined;
  params?: any | undefined;
  path: string;
}

/** @internal **/
export interface RemoveFilterPayload {
  path: Path;
}

/** @internal **/
export interface MoveFilterPayload {
  path: Path;
  filter: Filter;
}

/** @internal **/
export type FiltersEditorActions =
  | { type: 'addFilter'; payload: AddFilterPayload }
  | { type: 'updateFilters'; payload: UpdateFiltersPayload }
  | { type: 'removeFilter'; payload: RemoveFilterPayload }
  | { type: 'moveFilter'; payload: MoveFilterPayload };

export const filtersEditorReducer: Reducer<FiltersEditorState, FiltersEditorActions> = (
  state,
  action
) => {
  switch (action.type) {
    case 'addFilter':
      return {
        filters: addFilter(
          state.filters,
          action.payload.path,
          action.payload.dataViewId,
          action.payload.conditionalType
        ),
      };
    case 'updateFilters':
      return {
        ...state,
        filters: updateFilterItem(state.filters, action.payload),
      };
    case 'removeFilter':
      return {
        ...state,
        filters: removeFilter(state.filters, action.payload),
      };
    case 'moveFilter':
      return state;
    default:
      throw new Error('wrong action');
  }
};
