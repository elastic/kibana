define(function (require) {
  'use strict';
  var _ = require('lodash');
  var module = require('modules').get('kibana');
  var template = require('text!components/filter_bar/filter_bar.html');

  var mapFilter = require('components/filter_bar/lib/mapFilter');
  var toggleFilter = require('components/filter_bar/lib/toggleFilter');
  var toggleAll = require('components/filter_bar/lib/toggleAll');
  var removeFilter = require('components/filter_bar/lib/removeFilter');
  var removeAll = require('components/filter_bar/lib/removeAll');

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
        $scope.toggleAll = toggleAll($scope);
      }
    };
  });
});
