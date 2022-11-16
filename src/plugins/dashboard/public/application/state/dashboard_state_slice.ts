/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { ViewMode } from '@kbn/embeddable-plugin/public';
import { RefreshInterval } from '@kbn/data-plugin/common';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { PersistableControlGroupInput } from '@kbn/controls-plugin/common';

import { DashboardPanelMap } from '../../../common';
import type { DashboardOptions, DashboardState } from '../../types';

export const dashboardStateSlice = createSlice({
  name: 'dashboardState',
  initialState: {} as DashboardState,
  reducers: {
    setDashboardState: (state, action: PayloadAction<DashboardState>) => {
      return action.payload;
    },
    updateState: (state, action: PayloadAction<Partial<DashboardState>>) => {
      state = { ...state, ...action.payload };
    },
    setDashboardOptions: (state, action: PayloadAction<DashboardOptions>) => {
      state.options = action.payload;
    },
    setStateFromSaveModal: (
      state,
      action: PayloadAction<{
        title: string;
        description: string;
        tags?: string[];
        timeRestore: boolean;
        timeRange?: TimeRange;
        refreshInterval?: RefreshInterval;
      }>
    ) => {
      state.title = action.payload.title;
      state.description = action.payload.description;
      state.timeRestore = action.payload.timeRestore;
      state.timeRange = action.payload.timeRange;
      state.refreshInterval = action.payload.refreshInterval;
      if (action.payload.tags) {
        state.tags = action.payload.tags;
      }
    },
    setControlGroupState: (
      state,
      action: PayloadAction<PersistableControlGroupInput | undefined>
    ) => {
      state.controlGroupInput = action.payload;
    },
    setUseMargins: (state, action: PayloadAction<boolean>) => {
      state.options.useMargins = action.payload;
    },
    setSyncColors: (state, action: PayloadAction<boolean>) => {
      state.options.syncColors = action.payload;
    },
    setSyncCursor: (state, action: PayloadAction<boolean>) => {
      state.options.syncCursor = action.payload;
    },
    setSyncTooltips: (state, action: PayloadAction<boolean>) => {
      state.options.syncTooltips = action.payload;
    },
    setHidePanelTitles: (state, action: PayloadAction<boolean>) => {
      state.options.hidePanelTitles = action.payload;
    },
    setPanels: (state, action: PayloadAction<DashboardPanelMap>) => {
      state.panels = action.payload;
    },
    setExpandedPanelId: (state, action: PayloadAction<string | undefined>) => {
      state.expandedPanelId = action.payload;
    },
    setFullScreenMode: (state, action: PayloadAction<boolean>) => {
      state.fullScreenMode = action.payload;
    },
    setSavedQueryId: (state, action: PayloadAction<string | undefined>) => {
      state.savedQuery = action.payload;
    },
    setTimeRestore: (state, action: PayloadAction<boolean>) => {
      state.timeRestore = action.payload;
    },
    setTimeRange: (state, action: PayloadAction<TimeRange>) => {
      state.timeRange = action.payload;
    },
    setDescription: (state, action: PayloadAction<string>) => {
      state.description = action.payload;
    },
    setViewMode: (state, action: PayloadAction<ViewMode>) => {
      state.viewMode = action.payload;
    },
    setFiltersAndQuery: (state, action: PayloadAction<{ filters: Filter[]; query: Query }>) => {
      state.filters = action.payload.filters;
      state.query = action.payload.query;
    },
    setFilters: (state, action: PayloadAction<Filter[]>) => {
      state.filters = action.payload;
    },
    setTags: (state, action: PayloadAction<string[]>) => {
      state.tags = action.payload;
    },
    setTitle: (state, action: PayloadAction<string>) => {
      state.description = action.payload;
    },
    setQuery: (state, action: PayloadAction<Query>) => {
      state.query = action.payload;
    },
    setTimeslice: (state, action: PayloadAction<[number, number] | undefined>) => {
      state.timeslice = action.payload;
    },
  },
});

export const {
  setStateFromSaveModal,
  setControlGroupState,
  setDashboardOptions,
  setExpandedPanelId,
  setHidePanelTitles,
  setFiltersAndQuery,
  setDashboardState,
  setFullScreenMode,
  setSavedQueryId,
  setDescription,
  setTimeRestore,
  setTimeRange,
  setSyncColors,
  setSyncTooltips,
  setSyncCursor,
  setUseMargins,
  setViewMode,
  setFilters,
  setPanels,
  setTitle,
  setQuery,
  setTimeslice,
  setTags,
} = dashboardStateSlice.actions;
