/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import template from './filter_bar.html';
import '../directives/json_input';
import '../filter_editor';
import './filter_pill/filter_pill';
import { filterAppliedAndUnwrap } from './lib/filter_applied_and_unwrap';
import { FilterBarLibMapAndFlattenFiltersProvider } from './lib/map_and_flatten_filters';
import { FilterBarLibMapFlattenAndWrapFiltersProvider } from './lib/map_flatten_and_wrap_filters';
import { FilterBarLibExtractTimeFilterProvider } from './lib/extract_time_filter';
import { FilterBarLibFilterOutTimeBasedFilterProvider } from './lib/filter_out_time_based_filter';
import { changeTimeFilter } from './lib/change_time_filter';
import { FilterBarQueryFilterProvider } from './query_filter';
import { compareFilters } from './lib/compare_filters';
import { uiModules } from '../modules';

export { disableFilter, enableFilter, toggleFilterDisabled } from './lib/disable_filter';


const module = uiModules.get('kibana');

module.directive('filterBar', function (Private, Promise, getAppState, i18n) {
  const mapAndFlattenFilters = Private(FilterBarLibMapAndFlattenFiltersProvider);
  const mapFlattenAndWrapFilters = Private(FilterBarLibMapFlattenAndWrapFiltersProvider);
  const extractTimeFilter = Private(FilterBarLibExtractTimeFilterProvider);
  const filterOutTimeBasedFilter = Private(FilterBarLibFilterOutTimeBasedFilterProvider);
  const queryFilter = Private(FilterBarQueryFilterProvider);

  return {
    template,
    restrict: 'E',
    scope: {
      indexPatterns: '=',
      tooltipContent: '=',
    },
    link: function ($scope, $elem) {
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

      $scope.showCollapseLink = () => {
        const pill = $elem.find('filter-pill');
        return pill[pill.length - 1].offsetTop > 10;
      };

      const collapseFilterTooltip = i18n('common.ui.filterBar.collapseFilterTooltip', {
        defaultMessage: 'Collapse filter bar \n to show less'
      });
      const expandFilterTooltip = i18n('common.ui.filterBar.expandFilterTooltip', { defaultMessage: 'Expand filter bar \n to show more' });

      $scope.filterNavToggle = {
        isOpen: true,
        tooltipContent: collapseFilterTooltip
      };

      $scope.toggleFilterShown = () => {
        const collapser = $elem.find('.filter-nav-link__collapser');
        const filterPanelPill = $elem.find('.filter-panel__pill');
        if ($scope.filterNavToggle.isOpen) {
          $scope.filterNavToggle.tooltipContent = expandFilterTooltip;
          collapser.attr('aria-expanded', 'false');
          filterPanelPill.attr('style', 'width: calc(100% - 80px)');
        } else {
          $scope.filterNavToggle.tooltipContent = collapseFilterTooltip;
          collapser.attr('aria-expanded', 'true');
          filterPanelPill.attr('style', 'width: auto');
        }

        $scope.filterNavToggle.isOpen = !$scope.filterNavToggle.isOpen;
      };

      $scope.applyFilters = function (filters) {
        addAndInvertFilters(filterAppliedAndUnwrap(filters));
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
        if (!filter.meta.isNew) $scope.removeFilter(filter);
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

      updateFilters();
    }
  };
});
