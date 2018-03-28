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
export const getEmbeddablePersonalization =
  (state, panelId) => DashboardSelectors.getEmbeddablePersonalization(getDashboard(state), panelId);
export const getEmbeddableStagedFilter =
  (state, panelId) => DashboardSelectors.getEmbeddableStagedFilter(getDashboard(state), panelId);

export const getStagedFilters = state => DashboardSelectors.getStagedFilters(getDashboard(state));
export const getViewMode = state => DashboardSelectors.getViewMode(getDashboard(state));
export const getFullScreenMode = state => DashboardSelectors.getFullScreenMode(getDashboard(state));
export const getMaximizedPanelId = state => DashboardSelectors.getMaximizedPanelId(getDashboard(state));
export const getUseMargins = state => DashboardSelectors.getUseMargins(getDashboard(state));
export const getHidePanelTitles = state => DashboardSelectors.getHidePanelTitles(getDashboard(state));
export const getTimeRange = state => DashboardSelectors.getTimeRange(getDashboard(state));

export const getTitle = state => DashboardSelectors.getTitle(getDashboard(state));
export const getDescription = state => DashboardSelectors.getDescription(getDashboard(state));
