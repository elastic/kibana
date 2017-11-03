import {
  getEmbeddableTitle as getEmbeddableTitleFromEmbeddables,
  getEmbeddableEditUrl as getEmbeddableEditUrlFromEmbeddables,
  getEmbeddableError as getEmbeddableErrorFromEmbeddables,
  getEmbeddable as getEmbeddableFromEmbeddables,
} from './embeddables';

import {
  getPanel as getPanelFromPanels,
  getPanelType as getPanelTypeFromPanels
} from './panels';

import {
  getViewMode as getViewModeFromView,
  getFullScreenMode as getFullScreenModeFromView,
  getMaximizedPanelId as getMaximizedPanelIdFromView
} from './view';

import {
  getTitle as getTitleFromMetadata,
  getDescription as getDescriptionFromMetadata
} from './metadata';

/**
 * @typedef {Object} DashboardState
 * @property {Object} PanelsState
 * @property {Object} EmbeddablesState
 * @property {Object} ViewState
 */

/**
 * @param dashboard {DashboardState}
 * @return {PanelsState}
 */
export const getPanels = dashboard => dashboard.panels;
/**
 * @param dashboard {DashboardState}
 * @param panelId {string}
 * @return {PanelState}
 */
export const getPanel = (dashboard, panelId) => getPanelFromPanels(getPanels(dashboard), panelId);
/**
 * @param dashboard {DashboardState}
 * @param panelId {string}
 * @return {string}
 */
export const getPanelType = (dashboard, panelId) => getPanelTypeFromPanels(getPanels(dashboard), panelId);

/**
 * @param dashboard {DashboardState}
 * @return {EmbeddablesState}
 */
export const getEmbeddables = dashboard => dashboard.embeddables;
/**
 * @param dashboard {DashboardState}
 * @param panelId {string}
 * @return {EmbeddableState}
 */
export const getEmbeddable = (dashboard, panelId) => getEmbeddableFromEmbeddables(getEmbeddables(dashboard), panelId);
/**
 * @param dashboard {DashboardState}
 * @param panelId {string}
 * @return {string|Object}
 */
export const getEmbeddableError =
  (dashboard, panelId) => getEmbeddableErrorFromEmbeddables(getEmbeddables(dashboard), panelId);
/**
 * @param dashboard {DashboardState}
 * @param panelId {string}
 * @return {string}
 */
export const getEmbeddableTitle =
  (dashboard, panelId) => getEmbeddableTitleFromEmbeddables(getEmbeddables(dashboard), panelId);
/**
 * @param dashboard {DashboardState}
 * @param panelId {string}
 * @return {string}
 */
export const getEmbeddableEditUrl =
  (dashboard, panelId) => getEmbeddableEditUrlFromEmbeddables(getEmbeddables(dashboard), panelId);

/**
 * @param dashboard {DashboardState}
 * @return {ViewState}
 */
export const getView = dashboard => dashboard.view;
/**
 * @param dashboard {DashboardState}
 * @return {DashboardViewMode}
 */
export const getViewMode = dashboard => getViewModeFromView(getView(dashboard));
/**
 * @param dashboard {DashboardState}
 * @return {boolean}
 */
export const getFullScreenMode = dashboard => getFullScreenModeFromView(getView(dashboard));
/**
 * @param dashboard {DashboardState}
 * @return {string|undefined}
 */
export const getMaximizedPanelId = dashboard => getMaximizedPanelIdFromView(getView(dashboard));
export const getUseMargins = dashboard => getView(dashboard).useMargins;

/**
 * @param dashboard {DashboardState}
 * @return {MetadataState}
 */
export const getMetadata = dashboard => dashboard.metadata;
/**
 * @param dashboard {MetadataState}
 * @return {string}
 */
export const getTitle = dashboard => getTitleFromMetadata(getMetadata(dashboard));
/**
 * @param dashboard {MetadataState}
 * @return {string}
 */
export const getDescription = dashboard => getDescriptionFromMetadata(getMetadata(dashboard));
