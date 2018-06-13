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

import { Action } from 'redux';
import { createAction } from 'redux-actions';
import { Filters, Query, TimeRange } from 'ui/embeddable';
import { PanelId } from '../selectors';

export enum ViewActionTypeKeys {
  UPDATE_VIEW_MODE = 'UPDATE_VIEW_MODE',
  SET_VISIBLE_CONTEXT_MENU_PANEL_ID = 'SET_VISIBLE_CONTEXT_MENU_PANEL_ID',
  MAXIMIZE_PANEl = 'MAXIMIZE_PANEl',
  MINIMIZE_PANEL = 'MINIMIZE_PANEL',
  UPDATE_IS_FULL_SCREEN_MODE = 'UPDATE_IS_FULL_SCREEN_MODE',
  UPDATE_USE_MARGINS = 'UPDATE_USE_MARGINS',
  UPDATE_HIDE_PANEL_TITLES = 'UPDATE_HIDE_PANEL_TITLES',
  UPDATE_TIME_RANGE = 'UPDATE_TIME_RANGE',
  UPDATE_FILTERS = 'UPDATE_FILTERS',
  UPDATE_QUERY = 'UPDATE_QUERY',
}

export interface UpdateViewModeAction extends Action {
  type: ViewActionTypeKeys.UPDATE_VIEW_MODE;
  payload: string;
}

export interface SetVisibleContextMenuPanelIdAction extends Action {
  type: ViewActionTypeKeys.SET_VISIBLE_CONTEXT_MENU_PANEL_ID;
  payload: PanelId;
}

export interface SetVisibleContextMenuPanelIdAction extends Action {
  type: ViewActionTypeKeys.SET_VISIBLE_CONTEXT_MENU_PANEL_ID;
  payload: PanelId;
}

export interface MaximizePanelAction extends Action {
  type: ViewActionTypeKeys.MAXIMIZE_PANEl;
  payload: PanelId;
}

export interface MinimizePanelAction extends Action {
  type: ViewActionTypeKeys.MINIMIZE_PANEL;
}

export interface UpdateIsFullScreenModeAction extends Action {
  type: ViewActionTypeKeys.UPDATE_IS_FULL_SCREEN_MODE;
  payload: boolean;
}

export interface UpdateUseMarginsAction extends Action {
  type: ViewActionTypeKeys.UPDATE_USE_MARGINS;
  payload: boolean;
}

export interface UpdateHidePanelTitlesAction extends Action {
  type: ViewActionTypeKeys.UPDATE_HIDE_PANEL_TITLES;
  payload: boolean;
}

export interface UpdateTimeRangeAction extends Action {
  type: ViewActionTypeKeys.UPDATE_TIME_RANGE;
  payload: TimeRange;
}

export interface UpdateFiltersAction extends Action {
  type: ViewActionTypeKeys.UPDATE_FILTERS;
  payload: Filters;
}

export interface UpdateQueryAction extends Action {
  type: ViewActionTypeKeys.UPDATE_QUERY;
  payload: Query;
}

export type ViewActions =
  | UpdateViewModeAction
  | SetVisibleContextMenuPanelIdAction
  | MaximizePanelAction
  | MinimizePanelAction
  | UpdateIsFullScreenModeAction
  | UpdateUseMarginsAction
  | UpdateHidePanelTitlesAction
  | UpdateTimeRangeAction
  | UpdateFiltersAction
  | UpdateQueryAction;

export const updateViewMode = createAction<string>(
  ViewActionTypeKeys.UPDATE_VIEW_MODE
);
export const setVisibleContextMenuPanelId = createAction<PanelId>(
  ViewActionTypeKeys.SET_VISIBLE_CONTEXT_MENU_PANEL_ID
);
export const maximizePanel = createAction<PanelId>(
  ViewActionTypeKeys.MAXIMIZE_PANEl
);
export const minimizePanel = createAction<PanelId>(
  ViewActionTypeKeys.MINIMIZE_PANEL
);
export const updateIsFullScreenMode = createAction<boolean>(
  ViewActionTypeKeys.UPDATE_IS_FULL_SCREEN_MODE
);
export const updateUseMargins = createAction<boolean>(
  ViewActionTypeKeys.UPDATE_USE_MARGINS
);
export const updateHidePanelTitles = createAction<boolean>(
  ViewActionTypeKeys.UPDATE_HIDE_PANEL_TITLES
);
export const updateTimeRange = createAction<TimeRange>(
  ViewActionTypeKeys.UPDATE_TIME_RANGE
);
export const updateFilters = createAction<Filters>(
  ViewActionTypeKeys.UPDATE_FILTERS
);
export const updateQuery = createAction<Query>(ViewActionTypeKeys.UPDATE_QUERY);
