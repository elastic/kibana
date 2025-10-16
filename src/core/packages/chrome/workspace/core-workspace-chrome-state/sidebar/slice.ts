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

// Helper function to convert SidebarSize to width in pixels
const getSidebarWidth = (size: SidebarSize | number): number => {
  if (typeof size === 'number') {
    return size;
  }

  switch (size) {
    case 'regular':
      return 400;
    case 'wide':
      return 800;
    default:
      return 400; // Default to regular size
  }
};

export interface SidebarState {
  currentSidebarAppId: string | null;
  isOpen: boolean;
  width: number;
  isFullscreen: boolean;
}

const initialState: SidebarState = {
  currentSidebarAppId: null,
  isOpen: false,
  width: 400, // Default to regular size (400px)
  isFullscreen: false,
};

export const sidebarSlice = createSlice({
  name: 'sidebar',
  initialState,
  reducers: {
    closeSidebar: (state) => {
      state.currentSidebarAppId = null;
      state.isOpen = false;
    },
    setSidebarWidth: (state, action: PayloadAction<SidebarSize | number>) => {
      state.width = getSidebarWidth(action.payload);
    },
    setSidebarFullscreen: (state, action: PayloadAction<boolean>) => {
      state.isFullscreen = action.payload;
    },
    openSidebar: (state, action: PayloadAction<SidebarState['currentSidebarAppId']>) => {
      state.currentSidebarAppId = action.payload;
      state.isOpen = true;
    },
  },
});

export const { closeSidebar, setSidebarWidth, setSidebarFullscreen, openSidebar } =
  sidebarSlice.actions;

export const sidebarReducer = sidebarSlice.reducer;
