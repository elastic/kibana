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

import type { ToolboxSize } from '../types';

export interface ToolboxState {
  currentToolId: string | null;
  isOpen: boolean;
  size: ToolboxSize;
}

const initialState: ToolboxState = {
  currentToolId: null,
  isOpen: false,
  size: 'regular',
};

export const toolboxSlice = createSlice({
  name: 'toolbox',
  initialState,
  reducers: {
    closeToolbox: (state) => {
      state.currentToolId = null;
      state.isOpen = false;
    },
    setToolboxSize: (state, action: PayloadAction<ToolboxState['size']>) => {
      state.size = action.payload;
    },
    openToolbox: (state, action: PayloadAction<ToolboxState['currentToolId']>) => {
      state.currentToolId = action.payload;
      state.isOpen = true;
    },
  },
});

export const { closeToolbox, setToolboxSize, openToolbox } = toolboxSlice.actions;

export const toolboxReducer = toolboxSlice.reducer;
