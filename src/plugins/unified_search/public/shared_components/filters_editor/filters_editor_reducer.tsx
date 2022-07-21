/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Reducer } from 'react';
import type { Filter } from '@kbn/es-query';
import type { Path } from './filter_editors_types';

/** @internal **/
export interface FiltersEditorState {
  filters: Filter[];
}

/** @internal **/
export interface UpdateFiltersPayload {
  filters: Filter[];
}

/** @internal **/
export interface RemoveFilterPayload {
  path: Path;
}

/** @internal **/
export type FiltersEditorActions =
  | { type: 'updateFilters'; payload: UpdateFiltersPayload }
  | { type: 'removeFilter'; payload: RemoveFilterPayload };

export const filtersEditorReducer: Reducer<FiltersEditorState, FiltersEditorActions> = (
  state,
  action
) => {
  switch (action.type) {
    case 'updateFilters':
      return {
        filters: action.payload.filters,
      };
    case 'removeFilter':
      console.log(action);
      return state;
    default:
      throw new Error('wrong action');
  }
};
