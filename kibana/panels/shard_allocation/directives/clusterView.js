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

