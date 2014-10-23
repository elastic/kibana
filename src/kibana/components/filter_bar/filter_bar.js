define(function (require) {
  'use strict';
  var _ = require('lodash');
  var module = require('modules').get('kibana');
  var template = require('text!components/filter_bar/filter_bar.html');
  var moment = require('moment');

  var toggleFilter = require('components/filter_bar/lib/toggleFilter');
  var toggleAll = require('components/filter_bar/lib/toggleAll');
  var removeFilter = require('components/filter_bar/lib/removeFilter');
  var removeAll = require('components/filter_bar/lib/removeAll');

  var filterAppliedAndUnwrap = require('components/filter_bar/lib/filterAppliedAndUnwrap');

  module.directive('filterBar', function (Private, Promise) {
    var mapAndFlattenFilters = Private(require('components/filter_bar/lib/mapAndFlattenFilters'));
    var mapFlattenAndWrapFilters = Private(require('components/filter_bar/lib/mapFlattenAndWrapFilters'));
    var extractTimeFilter = Private(require('components/filter_bar/lib/extractTimeFilter'));
    var filterOutTimeBasedFilter = Private(require('components/filter_bar/lib/filterOutTimeBasedFilter'));
    var changeTimeFilter = Private(require('components/filter_bar/lib/changeTimeFilter'));

    return {
      restrict: 'E',
      template: template,
      scope: {
        state: '='
      },
      link: function ($scope, $el, attrs) {

        $scope.applyFilters = function (filters) {
          var newFilters = filterAppliedAndUnwrap(filters);
          $scope.state.filters = _.union($scope.state.filters, newFilters);
          $scope.newFilters = [];
          if ($scope.changeTimeFilter.$$meta.apply) {
            changeTimeFilter($scope.changeTimeFilter);
          }
        };

        $scope.clearFilterBar = function () {
          $scope.newFilters = [];
          $scope.changeTimeFilter = null;
        };

        $scope.$watch('state.$newFilters', function (filters) {
          // If the filters is not undefined and the length is greater then
          // one we need to set the newFilters attribute and allow the
          // users to decide what they want to apply.
          if (filters && filters.length > 1) {
            mapFlattenAndWrapFilters(filters)
            .then(function (results) {
              extractTimeFilter(results).then(function (filter) {
                $scope.changeTimeFilter = filter;
              });
              return results;
            })
            .then(filterOutTimeBasedFilter)
            .then(function (results) {
              $scope.newFilters = results;
            });
          // Just add single filters to the state.
          } else if (filters) {
            Promise.resolve(filters).then(function (filters) {
              extractTimeFilter(filters).then(changeTimeFilter);
              return filters;
            })
            .then(filterOutTimeBasedFilter)
            .then(function (filters) {
              $scope.state.filters = _.union($scope.state.filters, filters);
            });
          }
        });

        $scope.$watch('state.filters', function (filters) {
          mapAndFlattenFilters(filters).then(function (results) {
            $scope.filters = results;
          });
        });

        $scope.toggleFilter = toggleFilter($scope);
        $scope.removeFilter = removeFilter($scope);
        $scope.removeAll = removeAll($scope);
        $scope.toggleAll = toggleAll($scope);
      }
    };
  });
});
