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
  hasFooter: boolean;
  isChromeVisible: boolean;
  isLoading: boolean;
  hasBanner: boolean;
  isModern: boolean;
  isToolbarRight: boolean;
  isSearchInToolbar: boolean;
}

const initialState: WorkspaceState = {
  hasFooter: false,
  isChromeVisible: true,
  isLoading: false,
  hasBanner: false,
  isModern: false,
  isToolbarRight: true,
  isSearchInToolbar: false,
};

export const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setHasFooter: (state, action: PayloadAction<boolean>) => {
      state.hasFooter = action.payload;
    },
    setIsChromeVisible: (state, action: PayloadAction<boolean>) => {
      state.isChromeVisible = action.payload;
    },
    setIsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setHasBanner: (state, action: PayloadAction<boolean>) => {
      state.hasBanner = action.payload;
    },
    setIsModern: (state, action: PayloadAction<boolean>) => {
      state.isModern = action.payload;
    },
    setIsToolbarRight: (state, action: PayloadAction<boolean>) => {
      state.isToolbarRight = action.payload;
    },
    setIsSearchInToolbar: (state, action: PayloadAction<boolean>) => {
      state.isSearchInToolbar = action.payload;
    },
  },
});

export const {
  setHasFooter,
  setIsChromeVisible,
  setIsLoading,
  setHasBanner,
  setIsModern,
  setIsToolbarRight,
  setIsSearchInToolbar,
} = workspaceSlice.actions;

export const workspaceReducer = workspaceSlice.reducer;
