export function savedDashboardRegister(savedDashboards) {
  return {
    client: savedDashboards,
    name: 'dashboards',
    singular: 'Saved Dashboard',
    plural: 'Saved Dashboards'
  };
}
