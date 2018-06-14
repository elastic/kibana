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

import { createAction } from 'redux-actions';

export const updateViewMode = createAction('UPDATE_VIEW_MODE');
export const setVisibleContextMenuPanelId = createAction('SET_VISIBLE_CONTEXT_MENU_PANEL_ID');
export const maximizePanel = createAction('MAXIMIZE_PANEl');
export const minimizePanel = createAction('MINIMIZE_PANEL');
export const updateIsFullScreenMode = createAction('UPDATE_IS_FULL_SCREEN_MODE');
export const updateUseMargins = createAction('UPDATE_USE_MARGINS');
export const updateHidePanelTitles = createAction('HIDE_PANEL_TITLES');
export const updateTimeRange = createAction('UPDATE_TIME_RANGE');
export const updateFilters = createAction('UPDATE_FILTERS');
export const updateQuery = createAction('UPDATE_QUERY');
