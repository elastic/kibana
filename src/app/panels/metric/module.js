define([
  'angular',
  'app',
  'lodash',
  'require'
],
function (angular, app, _, require) {
  'use strict';

  var module = angular.module('kibana.panels.metric', []);
  app.useModule(module);

  module.controller('metric', function ($scope, querySrv, dashboard) {
    $scope.panelMeta = {
      status  : "Stable",
      description : "A panel displaying a value from the raw JSON answer"
    };

    // Set and populate defaults
    var _d = {
      expression : "results.hits.total"
    };
    _.defaults($scope.panel,_d);

    $scope.init = function () {
      $scope.ready = false;
      $scope.$on('refresh', function () {
        $scope.get_data();
      });
      $scope.get_data();
    };

    $scope.get_data = function () {
      if(dashboard.indices.length === 0) {
        return;
      }

      $scope.panelMeta.loading = true;

      var request, results;

      request = $scope.ejs.Request().indices(dashboard.indices);
      results = request.doSearch();

      results.then(function(results) {
        $scope.panelMeta.loading = false;

        var v = eval($scope.panel.expression), vStr;
        if (typeof v === 'undefined' || v === null) {
          vStr = 'N/A';
        } else if (typeof v === 'string') {
          vStr = v;
        } else if (typeof v === 'boolean') {
          vStr = v === true ? 'Yes' : 'No';
        } else if (typeof v === 'number') {
          var split = (v + '').split('.');
          split[0] = split[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1,');
          vStr = split.join('.');
        } else {
          vStr = v + '';
        }

        $scope.data = {
          value: vStr
        };

        $scope.$emit('render');
      });
    };

    $scope.set_refresh = function (state) {
      $scope.refresh = state;
    };

    $scope.close_edit = function() {
      if($scope.refresh) {
        $scope.get_data();
      }
      $scope.refresh =  false;
      $scope.$emit('render');
    };

  });
});