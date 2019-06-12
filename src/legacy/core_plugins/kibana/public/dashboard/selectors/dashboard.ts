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

import _ from 'lodash';
import { ContainerState, EmbeddableMetadata, Query, TimeRange } from 'ui/embeddable';
import { EmbeddableCustomization } from 'ui/embeddable/types';
import { Filter } from '@kbn/es-query';
import { RefreshInterval } from 'ui/timefilter/timefilter';
import { DashboardViewMode } from '../dashboard_view_mode';
import {
  DashboardMetadata,
  DashboardState,
  EmbeddableReduxState,
  EmbeddablesMap,
  PanelId,
} from './types';
import { SavedDashboardPanel, SavedDashboardPanelMap, StagedFilter } from '../types';

export const getPanels = (dashboard: DashboardState): Readonly<SavedDashboardPanelMap> =>
  dashboard.panels;

export const getPanel = (dashboard: DashboardState, panelId: PanelId): SavedDashboardPanel =>
  getPanels(dashboard)[panelId] as SavedDashboardPanel;

export const getPanelType = (dashboard: DashboardState, panelId: PanelId): string =>
  getPanel(dashboard, panelId).type;

export const getEmbeddables = (dashboard: DashboardState): EmbeddablesMap => dashboard.embeddables;

// TODO: rename panel.embeddableConfig to embeddableCustomization. Because it's on the panel that's stored on a
// dashboard, renaming this will require a migration step.
export const getEmbeddableCustomization = (
  dashboard: DashboardState,
  panelId: PanelId
): EmbeddableCustomization => getPanel(dashboard, panelId).embeddableConfig;

export const getEmbeddable = (dashboard: DashboardState, panelId: PanelId): EmbeddableReduxState =>
  dashboard.embeddables[panelId];

export const getEmbeddableError = (
  dashboard: DashboardState,
  panelId: PanelId
): string | object | undefined => getEmbeddable(dashboard, panelId).error;

export const getEmbeddableTitle = (
  dashboard: DashboardState,
  panelId: PanelId
): string | undefined => {
  const embeddable = getEmbeddable(dashboard, panelId);
  return embeddable && embeddable.initialized && embeddable.metadata
    ? embeddable.metadata.title
    : '';
};

export const getEmbeddableInitialized = (dashboard: DashboardState, panelId: PanelId): boolean =>
  getEmbeddable(dashboard, panelId).initialized;

export const getEmbeddableStagedFilter = (
  dashboard: DashboardState,
  panelId: PanelId
): object | undefined => getEmbeddable(dashboard, panelId).stagedFilter;

export const getEmbeddableMetadata = (
  dashboard: DashboardState,
  panelId: PanelId
): EmbeddableMetadata | undefined => getEmbeddable(dashboard, panelId).metadata;

export const getEmbeddableEditUrl = (
  dashboard: DashboardState,
  panelId: PanelId
): string | undefined => {
  const embeddable = getEmbeddable(dashboard, panelId);
  return embeddable && embeddable.initialized && embeddable.metadata
    ? embeddable.metadata.editUrl
    : '';
};

export const getVisibleContextMenuPanelId = (dashboard: DashboardState): PanelId | undefined =>
  dashboard.view.visibleContextMenuPanelId;

export const getUseMargins = (dashboard: DashboardState): boolean => dashboard.view.useMargins;

export const getViewMode = (dashboard: DashboardState): DashboardViewMode =>
  dashboard.view.viewMode;

export const getFullScreenMode = (dashboard: DashboardState): boolean =>
  dashboard.view.isFullScreenMode;

export const getHidePanelTitles = (dashboard: DashboardState): boolean =>
  dashboard.view.hidePanelTitles;

export const getMaximizedPanelId = (dashboard: DashboardState): PanelId | undefined =>
  dashboard.view.maximizedPanelId;

export const getTimeRange = (dashboard: DashboardState): TimeRange => dashboard.view.timeRange;

export const getRefreshConfig = (dashboard: DashboardState): RefreshInterval =>
  dashboard.view.refreshConfig;

export const getFilters = (dashboard: DashboardState): Filter[] => dashboard.view.filters;

export const getQuery = (dashboard: DashboardState): Query => dashboard.view.query;

export const getMetadata = (dashboard: DashboardState): DashboardMetadata => dashboard.metadata;

export const getTitle = (dashboard: DashboardState): string => dashboard.metadata.title;

export const getDescription = (dashboard: DashboardState): string | undefined =>
  dashboard.metadata.description;

export const getContainerState = (dashboard: DashboardState, panelId: PanelId): ContainerState => {
  const time = getTimeRange(dashboard);
  return {
    customTitle: getPanel(dashboard, panelId).title,
    embeddableCustomization: _.cloneDeep(getEmbeddableCustomization(dashboard, panelId) || {}),
    filters: getFilters(dashboard),
    hidePanelTitles: getHidePanelTitles(dashboard),
    isPanelExpanded: getMaximizedPanelId(dashboard) === panelId,
    query: getQuery(dashboard),
    timeRange: {
      from: time.from,
      to: time.to,
    },
    refreshConfig: getRefreshConfig(dashboard),
    viewMode: getViewMode(dashboard),
  };
};

/**
 * @return an array of filters any embeddables wish dashboard to apply
 */
export const getStagedFilters = (dashboard: DashboardState): StagedFilter[] =>
  _.compact(_.map(dashboard.embeddables, 'stagedFilter'));
