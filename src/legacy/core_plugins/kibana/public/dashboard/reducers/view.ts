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

import { cloneDeep } from 'lodash';
import { Reducer } from 'redux';

import { Filters, Query, TimeRange } from 'ui/embeddable';
import { QueryLanguageType } from 'ui/embeddable/types';
import { RefreshInterval } from 'ui/timefilter/timefilter';
import { ViewActions, ViewActionTypeKeys } from '../actions';
import { DashboardViewMode } from '../dashboard_view_mode';
import { PanelId, ViewState } from '../selectors';

const closeContextMenu = (view: ViewState) => ({
  ...view,
  visibleContextMenuPanelId: undefined,
});

const setVisibleContextMenuPanelId = (view: ViewState, panelId: PanelId) => ({
  ...view,
  visibleContextMenuPanelId: panelId,
});

const updateHidePanelTitles = (view: ViewState, hidePanelTitles: boolean) => ({
  ...view,
  hidePanelTitles,
});

const minimizePanel = (view: ViewState) => ({
  ...view,
  maximizedPanelId: undefined,
});

const maximizePanel = (view: ViewState, panelId: PanelId) => ({
  ...view,
  maximizedPanelId: panelId,
});

const updateIsFullScreenMode = (view: ViewState, isFullScreenMode: boolean) => ({
  ...view,
  isFullScreenMode,
});

const updateTimeRange = (view: ViewState, timeRange: TimeRange) => ({
  ...view,
  timeRange,
});

const updateRefreshConfig = (view: ViewState, refreshConfig: RefreshInterval) => ({
  ...view,
  refreshConfig,
});

const updateFilters = (view: ViewState, filters: Filters) => ({
  ...view,
  filters: cloneDeep(filters),
});

const updateQuery = (view: ViewState, query: Query) => ({
  ...view,
  query,
});

const updateUseMargins = (view: ViewState, useMargins: boolean) => ({
  ...view,
  useMargins,
});

const updateViewMode = (view: ViewState, viewMode: DashboardViewMode) => ({
  ...view,
  viewMode,
});

export const viewReducer: Reducer<ViewState> = (
  view = {
    filters: [],
    hidePanelTitles: false,
    isFullScreenMode: false,
    query: { language: QueryLanguageType.LUCENE, query: '' },
    timeRange: { to: 'now', from: 'now-15m' },
    refreshConfig: { pause: true, value: 0 },
    useMargins: true,
    viewMode: DashboardViewMode.VIEW,
  },
  action
): ViewState => {
  switch ((action as ViewActions).type) {
    case ViewActionTypeKeys.MINIMIZE_PANEL:
      return minimizePanel(view);
    case ViewActionTypeKeys.MAXIMIZE_PANEL:
      return maximizePanel(view, action.payload);
    case ViewActionTypeKeys.SET_VISIBLE_CONTEXT_MENU_PANEL_ID:
      return setVisibleContextMenuPanelId(view, action.payload);
    case ViewActionTypeKeys.CLOSE_CONTEXT_MENU:
      return closeContextMenu(view);
    case ViewActionTypeKeys.UPDATE_HIDE_PANEL_TITLES:
      return updateHidePanelTitles(view, action.payload);
    case ViewActionTypeKeys.UPDATE_TIME_RANGE:
      return updateTimeRange(view, action.payload);
    case ViewActionTypeKeys.UPDATE_REFRESH_CONFIG:
      return updateRefreshConfig(view, action.payload);
    case ViewActionTypeKeys.UPDATE_USE_MARGINS:
      return updateUseMargins(view, action.payload);
    case ViewActionTypeKeys.UPDATE_VIEW_MODE:
      return updateViewMode(view, action.payload);
    case ViewActionTypeKeys.UPDATE_IS_FULL_SCREEN_MODE:
      return updateIsFullScreenMode(view, action.payload);
    case ViewActionTypeKeys.UPDATE_FILTERS:
      return updateFilters(view, action.payload);
    case ViewActionTypeKeys.UPDATE_QUERY:
      return updateQuery(view, action.payload);
    default:
      return view;
  }
};
