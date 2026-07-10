/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Action, ActionReducerMapBuilder } from '@reduxjs/toolkit';
import type { WorkflowDetailState } from '../types';

// Type and map of loading states and their corresponding thunk type prefixes

export interface LoadingStates {
  /** Whether the workflow YAML is currently being saved */
  isSavingYaml: boolean;
}
type LoadingStateKeys = keyof LoadingStates;

// Map loading-state keys to their AsyncThunk `typePrefix`. Matching by string here
// (instead of importing the thunks) keeps this module out of the
// loading_states ↔ thunks ↔ slice module cycle at load time.
const LOADING_STATE_TYPE_PREFIXES: Record<LoadingStateKeys, string> = {
  isSavingYaml: 'detail/saveYamlThunk',
};

// Export initial loading state and reducer builder function

export const initialLoadingState: LoadingStates = {
  isSavingYaml: false,
};

// Add loading reducers for each thunk in the map
export const addLoadingStateReducers = (builder: ActionReducerMapBuilder<WorkflowDetailState>) => {
  (Object.entries(LOADING_STATE_TYPE_PREFIXES) as Array<[LoadingStateKeys, string]>).forEach(
    ([key, typePrefix]) => {
      builder.addMatcher(
        (action: Action): action is Action => action.type === `${typePrefix}/pending`,
        (state) => {
          state.loading[key] = true;
        }
      );
      builder.addMatcher(
        (action: Action): action is Action =>
          action.type === `${typePrefix}/fulfilled` || action.type === `${typePrefix}/rejected`,
        (state) => {
          state.loading[key] = false;
        }
      );
    }
  );
};
