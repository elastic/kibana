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
import type { MetricsExperienceState, MetricsExperienceTabState } from '../types';
import { selectTab } from '../selectors/tabs';

const initialState: MetricsExperienceState = {
  tabs: {
    byId: {},
  },
};

export type TabActionPayload<T extends { [key: string]: unknown } = {}> = { tabId: string } & T;

type TabAction<T extends { [key: string]: unknown } = {}> = PayloadAction<TabActionPayload<T>>;

const withTab = <TAction extends TabAction>(
  state: MetricsExperienceState,
  action: TAction,
  fn: (tab: MetricsExperienceTabState) => void
) => {
  const tab = selectTab(state, action.payload.tabId);

  if (tab) {
    fn(tab);
  }
};

export const metricsGridSlice = createSlice({
  name: 'metricsGrid',
  initialState,
  reducers: {
    setCurrentPage: (state, action: TabAction<Pick<MetricsExperienceTabState, 'currentPage'>>) => {
      return withTab(state, action, (tab) => {
        tab.currentPage = action.payload.currentPage;
      });
    },
    setSearchTerm: (state, action: TabAction<Pick<MetricsExperienceTabState, 'searchTerm'>>) => {
      return withTab(state, action, (tab) => {
        tab.searchTerm = action.payload.searchTerm;
        // Reset to first page when search changes
        tab.currentPage = 0;
      });
    },
    resetCurrentPage: (state, action: TabAction) => {
      return withTab(state, action, (tab) => {
        tab.currentPage = 0;
      });
    },
    setIsFullscreen: (
      state,
      action: TabAction<Pick<MetricsExperienceTabState, 'isFullscreen'>>
    ) => {
      return withTab(state, action, (tab) => {
        tab.isFullscreen = action.payload.isFullscreen;
      });
    },
    toggleFullscreen: (
      state,
      action: TabAction<Pick<MetricsExperienceTabState, 'isFullscreen'>>
    ) => {
      return withTab(state, action, (tab) => {
        tab.isFullscreen = !tab.isFullscreen;
      });
    },
    setDimensions: (state, action: TabAction<Pick<MetricsExperienceTabState, 'dimensions'>>) => {
      return withTab(state, action, (tab) => {
        tab.dimensions = action.payload.dimensions;
        // Reset to first page when search changes
        tab.currentPage = 0;
      });
    },
    setValueFilters: (
      state,
      action: TabAction<Pick<MetricsExperienceTabState, 'valueFilters'>>
    ) => {
      return withTab(state, action, (tab) => {
        tab.valueFilters = action.payload.valueFilters;
        // Reset to first page when search changes
        tab.currentPage = 0;
      });
    },
    resetIndexPattern: (state, action: TabAction) => withTab(state, action, () => {}),
  },
});

export const metricsGridActions = metricsGridSlice.actions;
