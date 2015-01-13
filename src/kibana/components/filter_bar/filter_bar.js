define(function (require) {
  'use strict';
  var _ = require('lodash');
  var module = require('modules').get('kibana');
  var template = require('text!components/filter_bar/filter_bar.html');
  var moment = require('moment');

  module.directive('filterBar', function (Private, Promise) {
    var filterActions = Private(require('components/filter_bar/lib/filterActions'));
    var mapAndFlattenFilters = Private(require('components/filter_bar/lib/mapAndFlattenFilters'));
    var mapFlattenAndWrapFilters = Private(require('components/filter_bar/lib/mapFlattenAndWrapFilters'));
    var processGlobalFilters = Private(require('components/filter_bar/lib/processGlobalFilters'));
    var extractTimeFilter = Private(require('components/filter_bar/lib/extractTimeFilter'));
    var filterOutTimeBasedFilter = Private(require('components/filter_bar/lib/filterOutTimeBasedFilter'));
    var filterAppliedAndUnwrap = require('components/filter_bar/lib/filterAppliedAndUnwrap');
    var changeTimeFilter = Private(require('components/filter_bar/lib/changeTimeFilter'));

    return {
      restrict: 'E',
      template: template,
      scope: {
        state: '='
      },
      link: function ($scope, $el, attrs) {
        // bind all the filter actions to the scope
        filterActions($scope).apply();

        // update the state filters to include global filters
        $scope.state.filters = processGlobalFilters($scope.state.filters);

        $scope.applyFilters = function (filters) {
          // add new filters
          $scope.addFilters(filterAppliedAndUnwrap(filters));
          $scope.newFilters = [];

          // change time filter
          if ($scope.changeTimeFilter && $scope.changeTimeFilter.meta && $scope.changeTimeFilter.meta.apply) {
            changeTimeFilter($scope.changeTimeFilter);
          }
        };

        $scope.clearFilterBar = function () {
          $scope.newFilters = [];
          $scope.changeTimeFilter = null;
        };

        $scope.$watch('state.$newFilters', function (filters) {
          if (!filters) return;

          // If the filters is not undefined and the length is greater then
          // one we need to set the newFilters attribute and allow the
          // users to decide what they want to apply.
          if (filters.length > 1) {
            return mapFlattenAndWrapFilters(filters)
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
          }

          // Just add single filters to the state.
          if (filters.length === 1) {
            Promise.resolve(filters).then(function (filters) {
              extractTimeFilter(filters)
              .then(function (timeFilter) {
                if (timeFilter) changeTimeFilter(timeFilter);
              });
              return filters;
            })
            .then(filterOutTimeBasedFilter)
            .then($scope.addFilters);
          }
        });

        $scope.$watch('state.filters', function (filters) {
          mapAndFlattenFilters(filters).then(function (results) {
            $scope.filters = _.sortBy(results, function (filter) {
              return !filter.meta.pinned;
            });
          });
        });
      }
    };
  });
});
