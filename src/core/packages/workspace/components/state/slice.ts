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

interface ToolboxState {
  currentToolId: string | null;
  isOpen: boolean;
  size: 'regular' | 'large' | 'fullWidth';
}

interface NavigationState {
  isOpen: boolean;
}

export interface WorkspaceState {
  navigation: NavigationState;
  toolbox: ToolboxState;
}

const initialState: WorkspaceState = {
  navigation: {
    isOpen: false,
  },
  toolbox: {
    currentToolId: null,
    isOpen: false,
    size: 'regular',
  },
};

export const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setIsNavigationOpen: (state, action: PayloadAction<boolean>) => {
      state.navigation.isOpen = action.payload;
    },
    setIsToolboxOpen: (state, action: PayloadAction<boolean>) => {
      if (action.payload && state.toolbox.currentToolId === null) {
        return;
      }

      state.toolbox.isOpen = action.payload;
    },
    setToolboxSize: (state, action: PayloadAction<ToolboxState['size']>) => {
      state.toolbox.size = action.payload;
    },
    setCurrentToolId: (state, action: PayloadAction<ToolboxState['currentToolId']>) => {
      state.toolbox.currentToolId = action.payload;
    },
  },
});

export const { setIsNavigationOpen, setIsToolboxOpen, setToolboxSize, setCurrentToolId } =
  workspaceSlice.actions;

export const workspaceReducer = workspaceSlice.reducer;
