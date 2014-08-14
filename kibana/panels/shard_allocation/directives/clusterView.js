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



/* jshint newcap: false */
define(function (require) {
  'use strict';
  var React = require('vendor/marvel/react/react');
  var ClusterView = require('../components/clusterView');
  return function (app) {
    app.directive('clusterView', function () {
      return {
        restrict: 'E',
        scope: {
          totalCount: '=totalCount',
          filter: '=filter',
          showing: '=showing',
          labels: '=labels'
        },
        link: function (scope, element) {
          var clusterView = ClusterView({ scope: scope });
          React.renderComponent(clusterView, element[0]);
        }
      };
    });
  };
});

