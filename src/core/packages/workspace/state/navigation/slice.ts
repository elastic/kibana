/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type PayloadAction, createSlice } from '@reduxjs/toolkit';

export interface NavigationState {
  isCollapsed: boolean;
}

const initialState: NavigationState = {
  isCollapsed: false,
};

export const navigationSlice = createSlice({
  name: 'workspace/navigation',
  initialState,
  reducers: {
    setIsNavigationCollapsed: (state, action: PayloadAction<boolean>) => {
      state.isCollapsed = action.payload;
    },
  },
});

export const { setIsNavigationCollapsed } = navigationSlice.actions;
export const navigationReducer = navigationSlice.reducer;
