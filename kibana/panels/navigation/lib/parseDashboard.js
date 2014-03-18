define(function () {
  'use strict';
  return function parseDashboard (dashboard) {
    try {
      dashboard._source.dashboard = JSON.parse(dashboard._source.dashboard);
    } catch (e) {
      dashboard._source.dashboard = {};
    }
    return dashboard; 
  };
});
