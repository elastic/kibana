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

import { Query, TimeRange } from 'ui/embeddable';
import { Filter } from '@kbn/es-query';
import { DashboardViewMode } from '../dashboard/dashboard_view_mode';
import * as DashboardSelectors from '../dashboard/selectors';
import { PanelId } from '../dashboard/selectors/types';
import { CoreKibanaState } from './types';
import { StagedFilter } from '../dashboard/types';

export const getDashboard = (state: CoreKibanaState): DashboardSelectors.DashboardState =>
  state.dashboard;

export const getPanels = (state: CoreKibanaState) =>
  DashboardSelectors.getPanels(getDashboard(state));
export const getPanel = (state: CoreKibanaState, panelId: PanelId) =>
  DashboardSelectors.getPanel(getDashboard(state), panelId);
export const getPanelType = (state: CoreKibanaState, panelId: PanelId) =>
  DashboardSelectors.getPanelType(getDashboard(state), panelId);

export const getEmbeddables = (state: CoreKibanaState) =>
  DashboardSelectors.getEmbeddables(getDashboard(state));
export const getEmbeddableError = (state: CoreKibanaState, panelId: PanelId) =>
  DashboardSelectors.getEmbeddableError(getDashboard(state), panelId);
export const getEmbeddableInitialized = (state: CoreKibanaState, panelId: PanelId) =>
  DashboardSelectors.getEmbeddableInitialized(getDashboard(state), panelId);
export const getEmbeddableCustomization = (state: CoreKibanaState, panelId: PanelId) =>
  DashboardSelectors.getEmbeddableCustomization(getDashboard(state), panelId);
export const getEmbeddableStagedFilter = (state: CoreKibanaState, panelId: PanelId) =>
  DashboardSelectors.getEmbeddableStagedFilter(getDashboard(state), panelId);
export const getEmbeddableMetadata = (state: CoreKibanaState, panelId: PanelId) =>
  DashboardSelectors.getEmbeddableMetadata(getDashboard(state), panelId);

export const getStagedFilters = (state: CoreKibanaState): StagedFilter[] =>
  DashboardSelectors.getStagedFilters(getDashboard(state));
export const getViewMode = (state: CoreKibanaState): DashboardViewMode =>
  DashboardSelectors.getViewMode(getDashboard(state));
export const getFullScreenMode = (state: CoreKibanaState): boolean =>
  DashboardSelectors.getFullScreenMode(getDashboard(state));
export const getMaximizedPanelId = (state: CoreKibanaState): PanelId | undefined =>
  DashboardSelectors.getMaximizedPanelId(getDashboard(state));
export const getUseMargins = (state: CoreKibanaState): boolean =>
  DashboardSelectors.getUseMargins(getDashboard(state));
export const getHidePanelTitles = (state: CoreKibanaState): boolean =>
  DashboardSelectors.getHidePanelTitles(getDashboard(state));
export const getTimeRange = (state: CoreKibanaState): TimeRange =>
  DashboardSelectors.getTimeRange(getDashboard(state));
export const getFilters = (state: CoreKibanaState): Filter[] =>
  DashboardSelectors.getFilters(getDashboard(state));
export const getQuery = (state: CoreKibanaState): Query =>
  DashboardSelectors.getQuery(getDashboard(state));

export const getTitle = (state: CoreKibanaState): string =>
  DashboardSelectors.getTitle(getDashboard(state));
export const getDescription = (state: CoreKibanaState): string | undefined =>
  DashboardSelectors.getDescription(getDashboard(state));
