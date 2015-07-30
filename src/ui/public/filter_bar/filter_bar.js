define(function (require) {
  var _ = require('lodash');
  var module = require('ui/modules').get('kibana');
  var template = require('ui/filter_bar/filter_bar.html');
  var moment = require('moment');

  module.directive('filterBar', function (Private, Promise, getAppState) {
    var mapAndFlattenFilters = Private(require('ui/filter_bar/lib/mapAndFlattenFilters'));
    var mapFlattenAndWrapFilters = Private(require('ui/filter_bar/lib/mapFlattenAndWrapFilters'));
    var extractTimeFilter = Private(require('ui/filter_bar/lib/extractTimeFilter'));
    var filterOutTimeBasedFilter = Private(require('ui/filter_bar/lib/filterOutTimeBasedFilter'));
    var filterAppliedAndUnwrap = require('ui/filter_bar/lib/filterAppliedAndUnwrap');
    var changeTimeFilter = Private(require('ui/filter_bar/lib/changeTimeFilter'));
    var queryFilter = Private(require('ui/filter_bar/query_filter'));

    return {
      restrict: 'E',
      template: template,
      scope: {},
      link: function ($scope, $el, attrs) {
        // bind query filter actions to the scope
        [
          'addFilters',
          'toggleFilter',
          'toggleAll',
          'pinFilter',
          'pinAll',
          'startEditingFilter',
          'stopEditingFilter',
          'mergeEditedFilter',
          'stringifyQuery',
          'invertFilter',
          'invertAll',
          'removeFilter',
          'removeAll'
        ].forEach(function (method) {
          $scope[method] = queryFilter[method];
        });

        $scope.state = getAppState();

        $scope.applyFilters = function (filters) {
          // add new filters
          $scope.addFilters(filterAppliedAndUnwrap(filters));
          $scope.newFilters = [];

          // change time filter
          if ($scope.changeTimeFilter && $scope.changeTimeFilter.meta && $scope.changeTimeFilter.meta.apply) {
            changeTimeFilter($scope.changeTimeFilter);
          }
        };

        $scope.aceLoaded = function (editor) {
          var session = editor.getSession();
          session.setTabSize(2);
          session.setUseSoftTabs(true);
        };

        $scope.clearFilterBar = function () {
          $scope.newFilters = [];
          $scope.changeTimeFilter = null;
        };

        // update the scope filter list on filter changes
        $scope.$listen(queryFilter, 'update', function () {
          updateFilters();
        });

        // when appState changes, update scope's state
        $scope.$watch(getAppState, function (appState) {
          $scope.state = appState;
        });

        $scope.$watch('state.$newFilters', function (filters) {
          if (!filters) return;

          // If filters is not undefined and the length is greater than
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

        function updateFilters() {
          var filters = queryFilter.getFilters();
          mapAndFlattenFilters(filters).then(function (results) {
            // used to display the current filters in the state
            $scope.filters = _.sortBy(results, function (filter) {
              return !filter.meta.pinned;
            });
            $scope.$emit('filterbar:updated');
          });
        }

        updateFilters();
      }
    };
  });
});
