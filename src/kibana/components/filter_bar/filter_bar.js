define(function (require) {
  'use strict';
  var _ = require('lodash');
  var module = require('modules').get('kibana');
  var template = require('text!components/filter_bar/filter_bar.html');

  var mapFilter = require('./lib/mapFilter');
  var toggleFilter = require('./lib/toggleFilter');
  var removeFilter = require('./lib/removeFilter');
  var removeAll = require('./lib/removeAll');

  module.directive('filterBar', function (courier) {
    return {
      restrict: 'E',
      template: template,
      scope: {
        state: '='
      },
      link: function ($scope, $el, attrs) {

        $scope.$watch('state.filters', function (filters) {
          // Get the filters from the searchSource
          $scope.filters = _(filters)
            .filter(function (filter) {
              return filter;
            })
            .flatten(true)
            .map(mapFilter)
            .value();

        });

        $scope.toggleFilter = toggleFilter($scope);
        $scope.removeFilter = removeFilter($scope);
        $scope.removeAll = removeAll($scope);
      }
    };
  });
});
