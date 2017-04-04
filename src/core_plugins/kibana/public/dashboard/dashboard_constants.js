
export const DashboardConstants = {
  ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM: 'addToDashboard',
  NEW_VISUALIZATION_ID_PARAM: 'addVisualization',
  LANDING_PAGE_PATH: '/dashboard/list',
  // NOTE, the following two urls have to have LANDING_PAGE_PATH as their sub url for
  // the chrome nav links to work correctly (eg. so navigating away from an opened dashboard, and back to
  // the dashboard app, will reopen the dashboard, not show the landing page.
  CREATE_NEW_DASHBOARD_URL: '/dashboard/list/create',
  DASHBOARD_EDIT_PATH: '/dashboard/list/edit'
};
