export const DashboardConstants = {
  ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM: 'addToDashboard',
  NEW_VISUALIZATION_ID_PARAM: 'addVisualization',
  LANDING_PAGE_PATH: '/dashboards',
  CREATE_NEW_DASHBOARD_URL: '/dashboard',
};
export const DASHBOARD_GRID_COLUMN_COUNT = 48;
export const DASHBOARD_GRID_HEIGHT = 20;
export const DEFAULT_PANEL_WIDTH = DASHBOARD_GRID_COLUMN_COUNT / 2;
export const DEFAULT_PANEL_HEIGHT = 15;

export function createDashboardEditUrl(id) {
  return `/dashboard/${id}`;
}
