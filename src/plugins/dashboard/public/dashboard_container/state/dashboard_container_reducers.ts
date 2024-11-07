/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PayloadAction } from '@reduxjs/toolkit';

import { isFilterPinned } from '@kbn/es-query';
import {
  DashboardReduxState,
  DashboardStateFromSaveModal,
  DashboardStateFromSettingsFlyout,
} from '../types';
import { DashboardContainerInput } from '../../../common';

export const dashboardContainerReducers = {
  // ------------------------------------------------------------------------------
  // Content Reducers
  // ------------------------------------------------------------------------------
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

  /**
   * Resets the dashboard to the last saved input, excluding:
   * 1) The time range, unless `timeRestore` is `true` - if we include the time range on reset even when
   *    `timeRestore` is `false`, this causes unecessary data fetches for the control group.
   * 2) The view mode, since resetting should never impact this - sometimes the Dashboard saved objects
   *    have this saved in and we don't want resetting to cause unexpected view mode changes.
   * 3) Pinned filters.
   */
  resetToLastSavedInput: (
    state: DashboardReduxState,
    action: PayloadAction<DashboardContainerInput>
  ) => {
    const keepPinnedFilters = [
      ...state.explicitInput.filters.filter(isFilterPinned),
      ...action.payload.filters,
    ];

    state.explicitInput = {
      ...action.payload,
      filters: keepPinnedFilters,
      ...(!state.explicitInput.timeRestore && { timeRange: state.explicitInput.timeRange }),
      viewMode: state.explicitInput.viewMode,
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
};
