define(function () {
  'use strict';
  return function (id) {
    return function findDashboardById (dashboard) {
      return dashboard._source.dashboard.base.id === id;
    };
  };
});
