import { embeddableHandlerCache } from '../cache/embeddable_handler_cache';
import _ from 'lodash';

/**
 * @typedef {Object} ViewState
 * @property {DashboardViewMode} viewMode
 * @property {boolean} isFullScreenMode
 * @property {string|undefined} maximizedPanelId
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

export const getEmbeddablePersonalization = (dashboard, panelId) => getPanel(dashboard, panelId).embeddableConfig;

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
  return embeddable && embeddable.initialized ? embeddableHandlerCache.getMetadata(panelId).title : '';
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
 * @param dashboard {DashboardState}
 * @param panelId {string}
 * @return {string}
 */
export const getEmbeddableEditUrl = (dashboard, panelId) =>  {
  const embeddable = getEmbeddable(dashboard, panelId);
  return embeddable && embeddable.initialized ? embeddableHandlerCache.getMetadata(panelId).editUrl : '';
};

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
 * @return {string|undefined}
 */
export const getTimeRange = dashboard => dashboard.view.timeRange;

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
 * @property {Object} timeRange
 * @property {Object} embeddablePersonalization
 * @property {boolean} hidePanelTitles
 */

/**
 *
 * @param dashboard {DashboardState}
 * @param panelId {string}
 * @return {ContainerState}
 */
export const getContainerState = (dashboard, panelId) => ({
  timeRange: _.cloneDeep(getTimeRange(dashboard)),
  embeddablePersonalization: _.cloneDeep(getEmbeddablePersonalization(dashboard, panelId) || {}),
  hidePanelTitles: getHidePanelTitles(dashboard),
});

/**
 *
 * @param embeddables {Array.<EmbeddableState>}
 * @return {Array.<{ field, value, operator, index }>} Array of filters any embeddables wish dashboard to apply
 */
export const getStagedFilters = ({ embeddables }) => _.compact(_.map(embeddables, 'stagedFilter'));

