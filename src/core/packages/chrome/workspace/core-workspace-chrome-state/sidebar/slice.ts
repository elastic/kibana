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

import type { SidebarSize } from '../types';

export interface SidebarState {
  currentSidebarAppId: string | null;
  isOpen: boolean;
  size: SidebarSize;
}

const initialState: SidebarState = {
  currentSidebarAppId: null,
  isOpen: false,
  size: 'regular',
};

export const sidebarSlice = createSlice({
  name: 'sidebar',
  initialState,
  reducers: {
    closeSidebar: (state) => {
      state.currentSidebarAppId = null;
      state.isOpen = false;
    },
    setSidebarSize: (state, action: PayloadAction<SidebarState['size']>) => {
      state.size = action.payload;
    },
    openSidebar: (state, action: PayloadAction<SidebarState['currentSidebarAppId']>) => {
      state.currentSidebarAppId = action.payload;
      state.isOpen = true;
    },
  },
});

export const { closeSidebar, setSidebarSize, openSidebar } = sidebarSlice.actions;

export const sidebarReducer = sidebarSlice.reducer;
