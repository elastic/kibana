/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Reducer } from 'react';
import type { Filter } from '@kbn/es-query';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { Path } from './filters_builder_types';
import type { ConditionTypes } from '../utils';
import { addFilter, moveFilter, removeFilter, updateFilter } from './filters_builder_utils';
import type { Operator } from '../filter_bar/filter_editor';

/** @internal **/
export interface FiltersBuilderState {
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
  path: string;
  field?: DataViewField;
  operator?: Operator;
  params?: Filter['meta']['params'];
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
export type FiltersBuilderActions =
  | { type: 'addFilter'; payload: AddFilterPayload }
  | { type: 'removeFilter'; payload: RemoveFilterPayload }
  | { type: 'moveFilter'; payload: MoveFilterPayload }
  | { type: 'updateFilter'; payload: UpdateFilterPayload };

export const FiltersBuilderReducer: Reducer<FiltersBuilderState, FiltersBuilderActions> = (
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
    case 'updateFilter':
      return {
        ...state,
        filters: updateFilter(
          state.filters,
          action.payload.path,
          action.payload.field,
          action.payload.operator,
          action.payload.params
        ),
      };
    default:
      throw new Error('wrong action');
  }
};
