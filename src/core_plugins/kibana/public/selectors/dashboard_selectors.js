import * as DashboardSelectors from '../dashboard/selectors';

export const getDashboard = state => state.dashboard;

export const getPanels = state => DashboardSelectors.getPanels(getDashboard(state));
export const getPanel = (state, panelId) => DashboardSelectors.getPanel(getDashboard(state), panelId);
export const getPanelType = (state, panelId) => DashboardSelectors.getPanelType(getDashboard(state), panelId);

export const getEmbeddables = state => DashboardSelectors.getEmbeddables(getDashboard(state));
export const getEmbeddable = (state, panelId) => DashboardSelectors.getEmbeddable(getDashboard(state), panelId);
export const getEmbeddableError = (state, panelId) =>
  DashboardSelectors.getEmbeddableError((getDashboard(state)), panelId);
export const getEmbeddableTitle = (state, panelId) => DashboardSelectors.getEmbeddableTitle(getDashboard(state), panelId);
export const getEmbeddableEditUrl = (state, panelId) => DashboardSelectors.getEmbeddableEditUrl(getDashboard(state), panelId);

export const getView = state => state.view;
export const getViewMode = state => DashboardSelectors.getViewMode(getDashboard(state));
export const getFullScreenMode = state => DashboardSelectors.getFullScreenMode(getDashboard(state));
export const getMaximizedPanelId = state => DashboardSelectors.getMaximizedPanelId(getDashboard(state));
