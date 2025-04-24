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

import type { ToolbarSize } from '../types';

export interface ToolbarState {
  currentToolId: string | null;
  isOpen: boolean;
  size: ToolbarSize;
}

const initialState: ToolbarState = {
  currentToolId: null,
  isOpen: false,
  size: 'regular',
};

export const toolbarSlice = createSlice({
  name: 'toolbar',
  initialState,
  reducers: {
    closeToolbar: (state) => {
      state.currentToolId = null;
      state.isOpen = false;
    },
    setToolbarSize: (state, action: PayloadAction<ToolbarState['size']>) => {
      state.size = action.payload;
    },
    openToolbar: (state, action: PayloadAction<ToolbarState['currentToolId']>) => {
      state.currentToolId = action.payload;
      state.isOpen = true;
    },
  },
});

export const { closeToolbar, setToolbarSize, openToolbar } = toolbarSlice.actions;

export const toolbarReducer = toolbarSlice.reducer;
