/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionReducerMapBuilder, AsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../../types';
import { saveYamlThunk } from '../thunks/save_yaml_thunk';
import type { WorkflowDetailState } from '../types';

// Type and map of loading states and their corresponding thunks

export interface LoadingStates {
  /** Whether the workflow YAML is currently being saved */
  isSavingYaml: boolean;
}
type LoadingStateKeys = keyof LoadingStates;

const LoadingStateThunksMap: Map<
  LoadingStateKeys,
  AsyncThunk<void, void, { state: RootState }>
> = new Map<LoadingStateKeys, AsyncThunk<void, void, { state: RootState }>>([
  // Map loading state entries we want to keep track in the store with the corresponding thunks
  ['isSavingYaml', saveYamlThunk],
]);

// Export initial loading state and reducer builder function

export const initialLoadingState: LoadingStates = Array.from(LoadingStateThunksMap.keys()).reduce(
  (acc, key) => ({ ...acc, [key]: false }),
  {} as LoadingStates
);

// Add loading reducers for each thunk in the map
export const addLoadingStateReducers = (builder: ActionReducerMapBuilder<WorkflowDetailState>) => {
  LoadingStateThunksMap.forEach((thunk, key) => {
    builder.addCase(thunk.pending, (state) => {
      state.loading[key] = true;
    });
    builder.addCase(thunk.fulfilled, (state) => {
      state.loading[key] = false;
    });
    builder.addCase(thunk.rejected, (state) => {
      state.loading[key] = false;
    });
  });
};
