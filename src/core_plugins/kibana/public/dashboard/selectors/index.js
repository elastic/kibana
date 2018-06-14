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

/**
 * @typedef {Object} ViewState
 * @property {DashboardViewMode} viewMode
 * @property {boolean} isFullScreenMode
 * @property {string|undefined} maximizedPanelId
 * @property {string|undefined} getVisibleContextMenuPanelId
 */

/**
 * @typedef {Object} EmbeddableReduxState
 * @property {string} title
 * @property {string} editUrl
 * @property {string|object} error
 */

/**
 * @typedef {Object} DashboardState
 * @property {Object.<string, PanelState>} panels
 * @property {Object.<string, EmbeddableReduxState>} embeddables
 * @property {ViewState} view
 */

/**
 * @param dashboard {DashboardState}
 * @return {Object.<string, PanelState>}
 */
export const getPanels = dashboard => dashboard.panels;

/**
 * @param dashboard {DashboardState}
 * @param panelId {string}
 * @return {PanelState}
 */
export const getPanel = (dashboard, panelId) => getPanels(dashboard)[panelId];
/**
 * @param dashboard {DashboardState}
 * @param panelId {string}
 * @return {string}
 */
export const getPanelType = (dashboard, panelId) => getPanel(dashboard, panelId).type;

export const getEmbeddables = (dashboard) => dashboard.embeddables;

// TODO: rename panel.embeddableConfig to embeddableCustomization. Because it's on the panel that's stored on a
// dashboard, renaming this will require a migration step.
export const getEmbeddableCustomization = (dashboard, panelId) => getPanel(dashboard, panelId).embeddableConfig;

/**
 * @param dashboard {DashboardState}
 * @param panelId {string}
 * @return {EmbeddableReduxState}
 */
export const getEmbeddable = (dashboard, panelId) => dashboard.embeddables[panelId];

/**
 * @param dashboard {DashboardState}
 * @param panelId {string}
 * @return {string|Object}
 */
export const getEmbeddableError = (dashboard, panelId) => getEmbeddable(dashboard, panelId).error;
/**
 * @param dashboard {DashboardState}
 * @param panelId {string}
 * @return {string}
 */
export const getEmbeddableTitle = (dashboard, panelId) => {
  const embeddable = getEmbeddable(dashboard, panelId);
  return embeddable && embeddable.initialized ? embeddable.metadata.title : '';
};

/**
 * @param dashboard {DashboardState}
 * @param panelId {string}
 * @return {boolean}
 */
export const getEmbeddableRenderComplete = (dashboard, panelId) => getEmbeddable(dashboard, panelId).renderComplete;

/**
 * @param dashboard {DashboardState}
 * @param panelId {string}
 * @return {boolean}
 */
export const getEmbeddableInitialized = (dashboard, panelId) => getEmbeddable(dashboard, panelId).initialized;

export const getEmbeddableStagedFilter = (dashboard, panelId) => getEmbeddable(dashboard, panelId).stagedFilter;

/**
 *
 * @param dashboard {DashboardState}
 * @param panelId {string}
 * @return {EmbeddableMetadata}
 */
export const getEmbeddableMetadata = (dashboard, panelId) => getEmbeddable(dashboard, panelId).metadata;

/**
 * @param dashboard {DashboardState}
 * @param panelId {string}
 * @return {string}
 */
export const getEmbeddableEditUrl = (dashboard, panelId) =>  {
  const embeddable = getEmbeddable(dashboard, panelId);
  return embeddable && embeddable.initialized ? embeddable.metadata.editUrl : '';
};


export const getVisibleContextMenuPanelId = dashboard => dashboard.view.visibleContextMenuPanelId;

/**
 * @param dashboard {DashboardState}
 * @return {boolean}
 */
export const getUseMargins = dashboard => dashboard.view.useMargins;
/**
 * @param dashboard {DashboardState}
 * @return {DashboardViewMode}
 */
export const getViewMode = dashboard => dashboard.view.viewMode;
/**
 * @param dashboard {DashboardState}
 * @return {boolean}
 */
export const getFullScreenMode = dashboard => dashboard.view.isFullScreenMode;
/**
 * @param dashboard {DashboardState}
 * @return {boolean}
 */
export const getHidePanelTitles = dashboard => dashboard.view.hidePanelTitles;
/**
 * @param dashboard {DashboardState}
 * @return {string|undefined}
 */
export const getMaximizedPanelId = dashboard => dashboard.view.maximizedPanelId;

/**
 * @param dashboard {DashboardState}
 * @return {{ from: {string}, to: {string}, mode: {string} }}
 */
export const getTimeRange = dashboard => dashboard.view.timeRange;

export const getFilters = dashboard => dashboard.view.filters;

export const getQuery = dashboard => dashboard.view.query;

/**
 * @typedef {Object} DashboardMetadata
 * @property {string} title
 * @property {string} description
 */

/**
 * @param dashboard {DashboardState}
 * @return {DashboardMetadata}
 */
export const getMetadata = dashboard => dashboard.metadata;
/**
 * @param dashboard {DashboardState}
 * @return {string}
 */
export const getTitle = dashboard => dashboard.metadata.title;
/**
 * @param dashboard {DashboardState}
 * @return {string}
 */
export const getDescription = dashboard => dashboard.metadata.description;

/**
 * This state object is specifically for communicating to embeddables and it's structure is not tied to
 * the redux tree structure.
 * @typedef {Object} ContainerState
 * @property {DashboardViewMode} viewMode - edit or view mode.
 * @property {String} timeRange.to - either an absolute time range in utc format or a relative one (e.g. now-15m)
 * @property {String} timeRange.from - either an absolute time range in utc format or a relative one (e.g. now-15m)
 * @property {Object} embeddableCustomization
 * @property {boolean} hidePanelTitles
 * @property {boolean} isPanelExpanded
 */

/**
 *
 * @param dashboard {DashboardState}
 * @param panelId {string}
 * @return {ContainerState}
 */
export const getContainerState = (dashboard, panelId) => {
  const time = getTimeRange(dashboard);
  return {
    timeRange: {
      to: time.to,
      from: time.from,
    },
    filters: getFilters(dashboard),
    query: getQuery(dashboard),
    embeddableCustomization: _.cloneDeep(getEmbeddableCustomization(dashboard, panelId) || {}),
    hidePanelTitles: getHidePanelTitles(dashboard),
    customTitle: getPanel(dashboard, panelId).title,
    viewMode: getViewMode(dashboard),
    isPanelExpanded: getMaximizedPanelId(dashboard) === panelId,
  };
};

/**
 *
 * @param embeddables {Array.<EmbeddableState>}
 * @return {Array.<{ field, value, operator, index }>} Array of filters any embeddables wish dashboard to apply
 */
export const getStagedFilters = ({ embeddables }) => _.compact(_.map(embeddables, 'stagedFilter'));

