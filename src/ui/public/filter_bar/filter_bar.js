define(function (require) {
  let _ = require('lodash');
  let module = require('ui/modules').get('kibana');
  let template = require('ui/filter_bar/filter_bar.html');
  let moment = require('moment');
  let angular = require('angular');

  require('ui/directives/json_input');

  module.directive('filterBar', function (Private, Promise, getAppState) {
    let mapAndFlattenFilters = Private(require('ui/filter_bar/lib/mapAndFlattenFilters'));
    let mapFlattenAndWrapFilters = Private(require('ui/filter_bar/lib/mapFlattenAndWrapFilters'));
    let extractTimeFilter = Private(require('ui/filter_bar/lib/extractTimeFilter'));
    let filterOutTimeBasedFilter = Private(require('ui/filter_bar/lib/filterOutTimeBasedFilter'));
    let filterAppliedAndUnwrap = require('ui/filter_bar/lib/filterAppliedAndUnwrap');
    let changeTimeFilter = Private(require('ui/filter_bar/lib/changeTimeFilter'));
    let queryFilter = Private(require('ui/filter_bar/query_filter'));
    let privateFilterFieldRegex = /(^\$|meta)/;

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
          'invertFilter',
          'invertAll',
          'removeFilter',
          'removeAll',
          'updateFilter'
        ].forEach(function (method) {
          $scope[method] = queryFilter[method];
        });

        $scope.state = getAppState();

        $scope.aceLoaded = function (editor) {
          editor.$blockScrolling = Infinity;
          let session = editor.getSession();
          session.setTabSize(2);
          session.setUseSoftTabs(true);
        };

        $scope.applyFilters = function (filters) {
          // add new filters
          $scope.addFilters(filterAppliedAndUnwrap(filters));
          $scope.newFilters = [];

          // change time filter
          if ($scope.changeTimeFilter && $scope.changeTimeFilter.meta && $scope.changeTimeFilter.meta.apply) {
            changeTimeFilter($scope.changeTimeFilter);
          }
        };

        $scope.startEditingFilter = function (source) {
          return $scope.editingFilter = {
            source: source,
            type: _.findKey(source, function (val, key) {
              return !key.match(privateFilterFieldRegex);
            }),
            model: convertToEditableFilter(source),
            alias: source.meta.alias
          };
        };

        $scope.stopEditingFilter = function () {
          $scope.editingFilter = null;
        };

        $scope.editDone = function () {
          $scope.updateFilter($scope.editingFilter);
          $scope.stopEditingFilter();
        };

        $scope.clearFilterBar = function () {
          $scope.newFilters = [];
          $scope.changeTimeFilter = null;
        };

        // update the scope filter list on filter changes
        $scope.$listen(queryFilter, 'update', function () {
          $scope.stopEditingFilter();
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

        function convertToEditableFilter(filter) {
          return _.omit(_.cloneDeep(filter), function (val, key) {
            return key.match(privateFilterFieldRegex);
          });
        }

        function updateFilters() {
          let filters = queryFilter.getFilters();
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
