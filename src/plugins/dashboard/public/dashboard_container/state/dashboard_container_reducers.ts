/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PayloadAction } from '@reduxjs/toolkit';

import {
  DashboardReduxState,
  DashboardPublicState,
  DashboardStateFromSaveModal,
  DashboardStateFromSettingsFlyout,
} from '../types';
import { DashboardContainerInput } from '../../../common';

export const dashboardContainerReducers = {
  // ------------------------------------------------------------------------------
  // Content Reducers
  // ------------------------------------------------------------------------------
  setControlGroupState: (
    state: DashboardReduxState,
    action: PayloadAction<DashboardContainerInput['controlGroupInput']>
  ) => {
    state.explicitInput.controlGroupInput = action.payload;
  },

  setPanels: (
    state: DashboardReduxState,
    action: PayloadAction<DashboardContainerInput['panels']>
  ) => {
    state.explicitInput.panels = action.payload;
  },

  // ------------------------------------------------------------------------------
  // Meta info Reducers
  // ------------------------------------------------------------------------------
  setStateFromSaveModal: (
    state: DashboardReduxState,
    action: PayloadAction<DashboardStateFromSaveModal>
  ) => {
    state.componentState.lastSavedId = action.payload.lastSavedId;

    state.explicitInput.tags = action.payload.tags;
    state.explicitInput.title = action.payload.title;
    state.explicitInput.description = action.payload.description;
    state.explicitInput.timeRestore = action.payload.timeRestore;

    if (action.payload.refreshInterval) {
      state.explicitInput.refreshInterval = action.payload.refreshInterval;
    }
    if (action.payload.timeRange) {
      state.explicitInput.timeRange = action.payload.timeRange;
    }
  },

  setStateFromSettingsFlyout: (
    state: DashboardReduxState,
    action: PayloadAction<DashboardStateFromSettingsFlyout>
  ) => {
    state.componentState.lastSavedId = action.payload.lastSavedId;

    state.explicitInput.tags = action.payload.tags;
    state.explicitInput.title = action.payload.title;
    state.explicitInput.description = action.payload.description;
    state.explicitInput.timeRestore = action.payload.timeRestore;

    state.explicitInput.useMargins = action.payload.useMargins;
    state.explicitInput.syncColors = action.payload.syncColors;
    state.explicitInput.syncCursor = action.payload.syncCursor;
    state.explicitInput.syncTooltips = action.payload.syncTooltips;
    state.explicitInput.hidePanelTitles = action.payload.hidePanelTitles;
  },

  setDescription: (
    state: DashboardReduxState,
    action: PayloadAction<DashboardContainerInput['description']>
  ) => {
    state.explicitInput.description = action.payload;
  },

  setViewMode: (
    state: DashboardReduxState,
    action: PayloadAction<DashboardContainerInput['viewMode']>
  ) => {
    state.explicitInput.viewMode = action.payload;
  },

  setTags: (state: DashboardReduxState, action: PayloadAction<DashboardContainerInput['tags']>) => {
    state.explicitInput.tags = action.payload;
  },

  setTitle: (
    state: DashboardReduxState,
    action: PayloadAction<DashboardContainerInput['title']>
  ) => {
    state.explicitInput.title = action.payload;
  },

  // ------------------------------------------------------------------------------
  // Unsaved Changes Reducers
  // ------------------------------------------------------------------------------
  setHasUnsavedChanges: (
    state: DashboardReduxState,
    action: PayloadAction<DashboardPublicState['hasUnsavedChanges']>
  ) => {
    state.componentState.hasUnsavedChanges = action.payload;
  },

  setLastSavedInput: (
    state: DashboardReduxState,
    action: PayloadAction<DashboardPublicState['lastSavedInput']>
  ) => {
    state.componentState.lastSavedInput = action.payload;
  },

  resetToLastSavedInput: (state: DashboardReduxState) => {
    state.explicitInput = {
      ...state.componentState.lastSavedInput,
      viewMode: state.explicitInput.viewMode, // keep current view mode when resetting
    };
  },

  // ------------------------------------------------------------------------------
  // Filtering Reducers
  // ------------------------------------------------------------------------------
  setFiltersAndQuery: (
    state: DashboardReduxState,
    action: PayloadAction<Pick<DashboardContainerInput, 'filters' | 'query'>>
  ) => {
    state.explicitInput.filters = action.payload.filters;
    state.explicitInput.query = action.payload.query;
  },

  setLastReloadRequestTimeToNow: (state: DashboardReduxState) => {
    state.explicitInput.lastReloadRequestTime = new Date().getTime();
  },

  setFilters: (
    state: DashboardReduxState,
    action: PayloadAction<DashboardContainerInput['filters']>
  ) => {
    state.explicitInput.filters = action.payload;
  },

  setQuery: (
    state: DashboardReduxState,
    action: PayloadAction<DashboardContainerInput['query']>
  ) => {
    state.explicitInput.query = action.payload;
  },

  setSavedQueryId: (
    state: DashboardReduxState,
    action: PayloadAction<DashboardPublicState['savedQueryId']>
  ) => {
    state.componentState.savedQueryId = action.payload;
  },

  setTimeRestore: (
    state: DashboardReduxState,
    action: PayloadAction<DashboardContainerInput['timeRestore']>
  ) => {
    state.explicitInput.timeRestore = action.payload;
  },

  setTimeRange: (
    state: DashboardReduxState,
    action: PayloadAction<DashboardContainerInput['timeRange']>
  ) => {
    state.explicitInput.timeRange = action.payload;
  },

  setRefreshInterval: (
    state: DashboardReduxState,
    action: PayloadAction<DashboardContainerInput['refreshInterval']>
  ) => {
    state.explicitInput.refreshInterval = action.payload;
  },

  setTimeslice: (
    state: DashboardReduxState,
    action: PayloadAction<DashboardContainerInput['timeslice']>
  ) => {
    state.explicitInput.timeslice = action.payload;
  },

  setExpandedPanelId: (state: DashboardReduxState, action: PayloadAction<string | undefined>) => {
    state.componentState.expandedPanelId = action.payload;
  },

  setFullScreenMode: (state: DashboardReduxState, action: PayloadAction<boolean>) => {
    state.componentState.fullScreenMode = action.payload;
  },

  // ------------------------------------------------------------------------------
  // Component state reducers
  // ------------------------------------------------------------------------------

  setHasOverlays: (state: DashboardReduxState, action: PayloadAction<boolean>) => {
    state.componentState.hasOverlays = action.payload;
  },

  setScrollToPanelId: (state: DashboardReduxState, action: PayloadAction<string | undefined>) => {
    state.componentState.scrollToPanelId = action.payload;
  },

  setHighlightPanelId: (state: DashboardReduxState, action: PayloadAction<string | undefined>) => {
    state.componentState.highlightPanelId = action.payload;
  },
};
