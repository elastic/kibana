/**
 * @typedef {Object} ViewState
 * @property {DashboardViewMode} viewMode
 * @property {boolean} isFullScreenMode
 * @property {string|undefined} maximizedPanelId
 */

/**
 * @param view {ViewState}
 * @return {DashboardViewMode}
 */
export const getViewMode = view => view.viewMode;
/**
 * @param view {ViewState}
 * @return {boolean}
 */
export const getFullScreenMode = view => view.isFullScreenMode;
/**
 * @param view {ViewState}
 * @return {string|undefined}
 */
export const getMaximizedPanelId = view => view.maximizedPanelId;
