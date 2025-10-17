/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface WorkspaceState {
  isLoading: boolean;
  currentAppId: string | undefined;
}

const initialState: WorkspaceState = {
  isLoading: false,
  currentAppId: undefined,
};

export const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setIsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setCurrentAppId: (state, action: PayloadAction<string | undefined>) => {
      state.currentAppId = action.payload;
    },
  },
});

export const { setIsLoading, setCurrentAppId } = workspaceSlice.actions;

export const workspaceReducer = workspaceSlice.reducer;
