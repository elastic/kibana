/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { handleActions, combineActions } from 'redux-actions';
import {
  updateViewMode,
  maximizePanel,
  minimizePanel,
  updateUseMargins,
  updateHidePanelTitles,
  updateIsFullScreenMode,
  updateTimeRange,
  updateFilters,
  updateQuery,
  setVisibleContextMenuPanelId,
} from '../actions';

import { DashboardViewMode } from '../dashboard_view_mode';

export const view = handleActions({
  [setVisibleContextMenuPanelId]: (state, { payload }) => ({
    ...state,
    visibleContextMenuPanelId: payload
  }),

  [updateViewMode]: (state, { payload }) => ({
    ...state,
    viewMode: payload
  }),

  [updateTimeRange]: (state, { payload }) => ({
    ...state,
    timeRange: payload
  }),

  [updateFilters]: (state, { payload }) => ({
    ...state,
    filters: payload
  }),

  [updateQuery]: (state, { payload }) => ({
    ...state,
    query: payload
  }),

  [updateUseMargins]: (state, { payload }) => ({
    ...state,
    useMargins: payload
  }),

  [updateHidePanelTitles]: (state, { payload }) => ({
    ...state,
    hidePanelTitles: payload
  }),

  [combineActions(maximizePanel, minimizePanel)]: (state, { payload }) => ({
    ...state,
    maximizedPanelId: payload
  }),

  [updateIsFullScreenMode]: (state, { payload }) => ({
    ...state,
    isFullScreenMode: payload
  }),
}, {
  isFullScreenMode: false,
  viewMode: DashboardViewMode.VIEW,
  maximizedPanelId: undefined,
  useMargins: true,
  hidePanelTitles: false,
});
