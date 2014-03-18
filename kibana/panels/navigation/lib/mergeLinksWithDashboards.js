define(function (require) {
  'use strict';
  var _ = require('lodash');
  var findDashboardById = require('./findDashboardById');
  return function (dashboards) {
    return function mergeLinksWithDashboards (link) {
      var id;
      var matches = link.url.match(/([^\/]+\.json)$/);
      if (matches) {
        id = matches[1];
        var repacement = _.find(dashboards, findDashboardById(id)); 
        if (repacement) {
          link.url = '../kibana/index.html#/dashboard/elasticsearch/'+encodeURIComponent(repacement._id);
        }
      }
      return link;
    };
  };
});
