/**
 * @typedef {Object} ViewState
 * @property {DashboardViewMode} viewMode
 * @property {boolean} isFullScreenMode
 * @property {string|undefined} maximizedPanelId
 */

/**
 * @typedef {Object} EmbeddableState
 * @property {string} title
 * @property {string} editUrl
 * @property {string|object} error
 */

/**
 * @typedef {Object} DashboardState
 * @property {Object.<string, PanelState>} panels
 * @property {Object.<string, EmbeddableState>} embeddables
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

/**
 * @param dashboard {DashboardState}
 * @param panelId {string}
 * @return {EmbeddableState}
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
export const getEmbeddableTitle = (dashboard, panelId) => getEmbeddable(dashboard, panelId).title;
/**
 * @param dashboard {DashboardState}
 * @param panelId {string}
 * @return {string}
 */
export const getEmbeddableEditUrl = (dashboard, panelId) => getEmbeddable(dashboard, panelId).editUrl;

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
 * @return {MetadataState}
 */
export const getMetadata = dashboard => dashboard.metadata;
/**
 * @param dashboard {MetadataState}
 * @return {string}
 */
export const getTitle = dashboard => dashboard.metadata.title;
/**
 * @param dashboard {MetadataState}
 * @return {string}
 */
export const getDescription = dashboard => dashboard.metadata.description;
