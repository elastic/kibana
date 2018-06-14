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

import * as DashboardSelectors from '../dashboard/selectors';

/**
 * @typedef {Object} KibanaCoreAppState
 * @property {Object} DashboardState
 */

/**
 * @param {KibanaCoreAppState} state
 * @return {DashboardState}
 */
export const getDashboard = state => state.dashboard;

export const getPanels = state => DashboardSelectors.getPanels(getDashboard(state));
export const getPanel = (state, panelId) => DashboardSelectors.getPanel(getDashboard(state), panelId);
export const getPanelType = (state, panelId) => DashboardSelectors.getPanelType(getDashboard(state), panelId);

export const getEmbeddables = state => DashboardSelectors.getEmbeddables(getDashboard(state));
export const getEmbeddableError = (state, panelId) =>
  DashboardSelectors.getEmbeddableError((getDashboard(state)), panelId);
export const getEmbeddableInitialized = (state, panelId) => DashboardSelectors.getEmbeddableInitialized(getDashboard(state), panelId);
export const getEmbeddableCustomization =
  (state, panelId) => DashboardSelectors.getEmbeddableCustomization(getDashboard(state), panelId);
export const getEmbeddableStagedFilter =
  (state, panelId) => DashboardSelectors.getEmbeddableStagedFilter(getDashboard(state), panelId);
export const getEmbeddableMetadata =
  (state, panelId) => DashboardSelectors.getEmbeddableMetadata(getDashboard(state), panelId);

export const getStagedFilters = state => DashboardSelectors.getStagedFilters(getDashboard(state));
export const getViewMode = state => DashboardSelectors.getViewMode(getDashboard(state));
export const getFullScreenMode = state => DashboardSelectors.getFullScreenMode(getDashboard(state));
export const getMaximizedPanelId = state => DashboardSelectors.getMaximizedPanelId(getDashboard(state));
export const getUseMargins = state => DashboardSelectors.getUseMargins(getDashboard(state));
export const getHidePanelTitles = state => DashboardSelectors.getHidePanelTitles(getDashboard(state));
export const getTimeRange = state => DashboardSelectors.getTimeRange(getDashboard(state));
export const getFilters = state => DashboardSelectors.getFilters(getDashboard(state));
export const getQuery = state => DashboardSelectors.getQuery(getDashboard(state));

export const getTitle = state => DashboardSelectors.getTitle(getDashboard(state));
export const getDescription = state => DashboardSelectors.getDescription(getDashboard(state));
