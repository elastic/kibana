define(function (require) {
  'use strict';
  var calculateClass = require('../lib/calculateClass');
  return function (app) {
    app.directive('shardGroups', function () {
      return {
        restrict: 'E',
        scope: {
          groups: '=groups',
          unassigned: '=unassigned'
        },
        templateUrl: '/kibana/app/panels/marvel/shard_allocation/directives/shardGroups.html',
        link: function (scope) {
          scope.calculateClass = calculateClass;
        }
      };
    });
  };
});
