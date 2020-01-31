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
import html from './doc_table.html';
import './infinite_scroll';
import './components/table_header';
import './components/table_row';
import { dispatchRenderComplete } from '../../../../../../plugins/kibana_utils/public';
import { uiModules } from 'ui/modules';
import './components/pager';
import './lib/pager';

import { getLimitedSearchResultsMessage } from './doc_table_strings';

uiModules
  .get('app/discover')
  .directive('docTable', function(config, getAppState, pagerFactory, $filter) {
    return {
      restrict: 'E',
      template: html,
      scope: {
        sorting: '=',
        columns: '=',
        hits: '=',
        totalHitCount: '=',
        indexPattern: '=',
        isLoading: '=?',
        infiniteScroll: '=?',
        filter: '=?',
        filters: '=?',
        minimumVisibleRows: '=?',
        onAddColumn: '=?',
        onChangeSortOrder: '=?',
        onMoveColumn: '=?',
        onRemoveColumn: '=?',
        inspectorAdapters: '=?',
      },
      link: function($scope, $el) {
        $scope.$watch('minimumVisibleRows', minimumVisibleRows => {
          $scope.limit = Math.max(minimumVisibleRows || 50, $scope.limit || 50);
        });

        $scope.persist = {
          sorting: $scope.sorting,
          columns: $scope.columns,
        };

        const limitTo = $filter('limitTo');
        const calculateItemsOnPage = () => {
          $scope.pager.setTotalItems($scope.hits.length);
          $scope.pageOfItems = limitTo($scope.hits, $scope.pager.pageSize, $scope.pager.startIndex);
        };

        $scope.limitedResultsWarning = getLimitedSearchResultsMessage(
          config.get('discover:sampleSize')
        );

        $scope.addRows = function() {
          $scope.limit += 50;
        };

        // This exists to fix the problem of an empty initial column list not playing nice with watchCollection.
        $scope.$watch('columns', function(columns) {
          if (columns.length !== 0) return;

          const $state = getAppState();
          $scope.columns.push('_source');
          if ($state) $state.replace();
        });

        $scope.$watchCollection('columns', function(columns, oldColumns) {
          if (oldColumns.length === 1 && oldColumns[0] === '_source' && $scope.columns.length > 1) {
            _.pull($scope.columns, '_source');
          }

          if ($scope.columns.length === 0) $scope.columns.push('_source');
        });

        $scope.$watch('hits', hits => {
          if (!hits) return;

          // Reset infinite scroll limit
          $scope.limit = 50;

          if (hits.length === 0) {
            dispatchRenderComplete($el[0]);
          }

          if ($scope.infiniteScroll) return;
          $scope.pager = pagerFactory.create(hits.length, 50, 1);
          calculateItemsOnPage();
        });

        $scope.pageOfItems = [];
        $scope.onPageNext = () => {
          $scope.pager.nextPage();
          calculateItemsOnPage();
        };

        $scope.onPagePrevious = () => {
          $scope.pager.previousPage();
          calculateItemsOnPage();
        };

        $scope.shouldShowLimitedResultsWarning = () =>
          !$scope.pager.hasNextPage && $scope.pager.totalItems < $scope.totalHitCount;
      },
    };
  });
