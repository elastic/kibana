/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface MetricsGridState {
  // Pagination state
  currentPage: number;

  // UI state
  isFullscreen: boolean;

  // Dimension state
  dimensions: string[];

  // Values state
  valueFilters: string[];
}

const initialState: MetricsGridState = {
  currentPage: 0,
  isFullscreen: false,
  dimensions: [],
  valueFilters: [],
};

export const metricsGridSlice = createSlice({
  name: 'metricsGrid',
  initialState,
  reducers: {
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
    resetCurrentPage: (state) => {
      state.currentPage = 0;
    },
    setIsFullscreen: (state, action: PayloadAction<boolean>) => {
      state.isFullscreen = action.payload;
    },
    toggleFullscreen: (state) => {
      state.isFullscreen = !state.isFullscreen;
    },
    setDimensions: (state, action: PayloadAction<string[]>) => {
      state.dimensions = action.payload;
      // Reset to first page when search changes
      state.currentPage = 0;
    },
    setValueFilters: (state, action: PayloadAction<string[]>) => {
      state.valueFilters = action.payload;
      // Reset to first page when search changes
      state.currentPage = 0;
    },
    resetIndexPattern: () => initialState,
  },
});

export const {
  setCurrentPage,
  resetCurrentPage,
  setIsFullscreen,
  toggleFullscreen,
  setDimensions,
  setValueFilters,
  resetIndexPattern,
} = metricsGridSlice.actions;

// Selectors
export const selectCurrentPage = (state: { metricsGrid: MetricsGridState }) =>
  state.metricsGrid.currentPage;
export const selectIsFullscreen = (state: { metricsGrid: MetricsGridState }) =>
  state.metricsGrid.isFullscreen;
export const selectDimensions = (state: { metricsGrid: MetricsGridState }) =>
  state.metricsGrid.dimensions;
export const selectValueFilters = (state: { metricsGrid: MetricsGridState }) =>
  state.metricsGrid.valueFilters;
