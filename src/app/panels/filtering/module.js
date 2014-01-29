/*

  ## filtering

*/
define([
  'angular',
  'app',
  'lodash'
],
function (angular, app, _) {
  'use strict';

  var module = angular.module('kibana.panels.filtering', []);
  app.useModule(module);

  module.controller('filtering', function($scope, filterSrv, $rootScope, dashboard) {

    $scope.panelMeta = {
      status  : "Stable",
      description : "A controllable list of all filters currently applied to the dashboard. You "+
        "almost certainly want one of these on your dashboard somewhere."
    };

    // Set and populate defaults
    var _d = {
    };
    _.defaults($scope.panel,_d);

    $scope.$on('filter', function() {
      $scope.row.notice = true;
    });

    $scope.init = function() {
      $scope.filterSrv = filterSrv;
    };

    $scope.remove = function(id) {
      filterSrv.remove(id);
    };

    // This function should be moved to the service
    $scope.toggle = function(id) {
      filterSrv.list[id].active = !filterSrv.list[id].active;
      dashboard.refresh();
    };

    $scope.add = function(query) {
      query = query || '*';
      filterSrv.set({
        editing   : true,
        type      : 'querystring',
        query     : query,
        mandate   : 'must'
      },undefined,true);
    };

    $scope.refresh = function() {
      dashboard.refresh();
    };

    $scope.render = function() {
      $rootScope.$broadcast('render');
    };

    $scope.show_key = function(key) {
      return !_.contains(['type','id','alias','mandate','active','editing'],key);
    };

    $scope.getFilterClass = function(filter) {
      if(filter.active !== true) {
        return 'muted';
      } else {
        switch (filter.mandate)
        {
        case 'must':
          return 'text-success';
        case 'mustNot':
          return 'text-error';
        case 'either':
          return 'text-warning';
        default:
          return 'text-info';
        }
      }
    };

    $scope.isEditable = function(filter) {
      var uneditable = ['time'];
      if(_.contains(uneditable,filter.type)) {
        return false;
      } else {
        return true;
      }
    };

  });
});