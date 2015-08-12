define(function (require) {
  return function savedDashboardFn(Private, savedDashboards) {
    return {
      service: savedDashboards,
      name: 'dashboards',
      noun: 'Dashboard',
      nouns: 'dashboards'
    };
  };
});
