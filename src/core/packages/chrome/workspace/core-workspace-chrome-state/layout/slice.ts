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

export interface WorkspaceLayoutState {
  isChromeVisible: boolean;
  hasHeaderBanner: boolean;
  hasAppMenu: boolean;
}

const initialState: WorkspaceLayoutState = {
  isChromeVisible: false,
  hasHeaderBanner: false,
  hasAppMenu: false,
};

export const layoutSlice = createSlice({
  name: 'workspace/layout',
  initialState,
  reducers: {
    setIsChromeVisible: (state, action: PayloadAction<boolean>) => {
      state.isChromeVisible = action.payload;
    },
    setHasHeaderBanner: (state, action: PayloadAction<boolean>) => {
      state.hasHeaderBanner = action.payload;
    },
    setHasAppMenu: (state, action: PayloadAction<boolean>) => {
      state.hasAppMenu = action.payload;
    },
  },
});

export const { setIsChromeVisible, setHasHeaderBanner, setHasAppMenu } = layoutSlice.actions;

export const layoutReducer = layoutSlice.reducer;
