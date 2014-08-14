/**
 * ELASTICSEARCH CONFIDENTIAL
 * _____________________________
 *
 *  [2014] Elasticsearch Incorporated All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Elasticsearch Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Elasticsearch Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Elasticsearch Incorporated.
 */



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
