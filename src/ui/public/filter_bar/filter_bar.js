import _ from 'lodash';
import template from 'ui/filter_bar/filter_bar.html';
import 'ui/directives/json_input';
import '../filter_editor';
import { filterAppliedAndUnwrap } from 'ui/filter_bar/lib/filter_applied_and_unwrap';
import { FilterBarLibMapAndFlattenFiltersProvider } from 'ui/filter_bar/lib/map_and_flatten_filters';
import { FilterBarLibMapFlattenAndWrapFiltersProvider } from 'ui/filter_bar/lib/map_flatten_and_wrap_filters';
import { FilterBarLibExtractTimeFilterProvider } from 'ui/filter_bar/lib/extract_time_filter';
import { FilterBarLibFilterOutTimeBasedFilterProvider } from 'ui/filter_bar/lib/filter_out_time_based_filter';
import { FilterBarLibChangeTimeFilterProvider } from 'ui/filter_bar/lib/change_time_filter';
import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';
import { compareFilters } from './lib/compare_filters';
import { uiModules } from 'ui/modules';

export { disableFilter, enableFilter, toggleFilterDisabled } from './lib/disable_filter';

const MULTI_SELECT_KEY = 18; // alt
let isMultiSelect = false;
window.addEventListener('keydown', (event) => {
  if (event.keyCode === MULTI_SELECT_KEY) {
    isMultiSelect = true;
  }
}, false);
window.addEventListener('keyup', async (event) => {
  if (event.keyCode === MULTI_SELECT_KEY) {
    isMultiSelect = false;
  }
}, false);

const module = uiModules.get('kibana');

module.directive('filterBar', function (Private, Promise, getAppState) {
  const mapAndFlattenFilters = Private(FilterBarLibMapAndFlattenFiltersProvider);
  const mapFlattenAndWrapFilters = Private(FilterBarLibMapFlattenAndWrapFiltersProvider);
  const extractTimeFilter = Private(FilterBarLibExtractTimeFilterProvider);
  const filterOutTimeBasedFilter = Private(FilterBarLibFilterOutTimeBasedFilterProvider);
  const changeTimeFilter = Private(FilterBarLibChangeTimeFilterProvider);
  const queryFilter = Private(FilterBarQueryFilterProvider);

  return {
    template,
    restrict: 'E',
    scope: {
      indexPatterns: '='
    },
    link: function ($scope) {
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
        'removeAll'
      ].forEach(function (method) {
        $scope[method] = queryFilter[method];
      });

      $scope.state = getAppState();
      $scope.newFilters = [];

      $scope.showAddFilterButton = () => {
        return _.compact($scope.indexPatterns).length > 0;
      };

      $scope.applyFilters = function (filters) {
        addAndInvertFilters(mergeFilters(filterAppliedAndUnwrap(filters)));
        $scope.newFilters = [];

        // change time filter
        if ($scope.changeTimeFilter && $scope.changeTimeFilter.meta && $scope.changeTimeFilter.meta.apply) {
          changeTimeFilter($scope.changeTimeFilter);
        }
      };

      $scope.addFilter = () => {
        $scope.editingFilter = {
          meta: { isNew: true }
        };
      };

      $scope.deleteFilter = (filter) => {
        $scope.removeFilter(filter);
        if (filter === $scope.editingFilter) $scope.cancelEdit();
      };

      $scope.editFilter = (filter) => {
        $scope.editingFilter = filter;
      };

      $scope.cancelEdit = () => {
        delete $scope.editingFilter;
      };

      $scope.saveEdit = (filter, newFilter, isPinned) => {
        if (!filter.isNew) $scope.removeFilter(filter);
        delete $scope.editingFilter;
        $scope.addFilters([newFilter], isPinned);
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
        if (!filters || filters.length === 0) return;

        // Allow the users to decide what filters to apply when
        // - more than one new filter getting added
        // - new filters exist that have not been applied
        // - multiselect is enabled
        if (filters.length > 1 || $scope.newFilters.length > 0 || isMultiSelect) {
          return mapFlattenAndWrapFilters(filters)
          .then(function (results) {
            extractTimeFilter(results).then(function (filter) {
              $scope.changeTimeFilter = filter;
            });
            return results;
          })
          .then(filterOutTimeBasedFilter)
          .then(function (results) {
            $scope.newFilters = $scope.newFilters.concat(results);
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
          .then(addAndInvertFilters);
        }
      });

      function addAndInvertFilters(filters) {
        const existingFilters = queryFilter.getFilters();
        const inversionFilters = _.filter(existingFilters, (existingFilter) => {
          const newMatchingFilter = _.find(filters, _.partial(compareFilters, existingFilter));
          return newMatchingFilter
            && newMatchingFilter.meta
            && existingFilter.meta
            && existingFilter.meta.negate !== newMatchingFilter.meta.negate;
        });
        const newFilters = _.reject(filters, (filter) => {
          return _.find(inversionFilters, _.partial(compareFilters, filter));
        });

        _.forEach(inversionFilters, $scope.invertFilter);
        $scope.addFilters(newFilters);
      }

      function updateFilters() {
        const filters = queryFilter.getFilters();
        mapAndFlattenFilters(filters).then(function (results) {
          // used to display the current filters in the state
          $scope.filters = _.sortBy(results, function (filter) {
            return !filter.meta.pinned;
          });
          $scope.$emit('filterbar:updated');
        });
      }

      function mergeFilters(filters) {
        // Group filters by key
        const filterGroups = new Map();
        const filtersWithNoKey = [];
        filters.forEach((filter) => {
          const key = _.get(filter, 'meta.key');
          if (!key) {
            filtersWithNoKey.push(filter);
            return;
          }

          if (!filterGroups.has(key)) {
            filterGroups.set(key, [filter]);
          } else {
            filterGroups.set(key, filterGroups.get(key).concat(filter));
          }
        });

        const filtersWithKey = [];
        filterGroups.forEach((filterGroup, key) => {
          if (filterGroup.length === 1) {
            // Key with only one filter
            filtersWithKey.push(filterGroup[0]);
          } else {
            const values = [];
            const shouldFilters = [];
            const mustNotFilters = [];
            filterGroup.forEach((filter) => {
              const value = _.get(filter, 'meta.value', '');
              if (_.get(filter, 'meta.negate', false)) {
                values.push('!' + value);
                mustNotFilters.push(cleanFilter(filter));
              } else {
                values.push(value);
                shouldFilters.push(cleanFilter(filter));
              }
            });

            // Key with multiple filters - combine into OR query
            filtersWithKey.push({
              bool: {
                should: shouldFilters,
                must_not: mustNotFilters
              },
              meta: {
                alias: `${key}: ${values.join()}`
              }
            });
          }
        });

        return filtersWithKey.concat(filtersWithNoKey);
      }

      function cleanFilter(filter) {
        if (_.has(filter, 'query')) {
          return filter.query;
        }

        delete filter.meta;
        return filter;
      }

      updateFilters();
    }
  };
});
