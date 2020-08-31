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

import html from './doc_table.html';
import { dispatchRenderComplete } from '../../../../../kibana_utils/public';
import { SAMPLE_SIZE_SETTING } from '../../../../common';
// @ts-ignore
import { getLimitedSearchResultsMessage } from './doc_table_strings';
import { getServices } from '../../../kibana_services';
import './index.scss';

export interface LazyScope extends ng.IScope {
  [key: string]: any;
}

export function createDocTableDirective(pagerFactory: any, $filter: any) {
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
      minimumVisibleRows: '=?',
      onAddColumn: '=?',
      onChangeSortOrder: '=?',
      onMoveColumn: '=?',
      onRemoveColumn: '=?',
      inspectorAdapters: '=?',
    },
    link: ($scope: LazyScope, $el: JQuery) => {
      $scope.$watch('minimumVisibleRows', (minimumVisibleRows: number) => {
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
        getServices().uiSettings.get(SAMPLE_SIZE_SETTING, 500)
      );

      $scope.addRows = function () {
        $scope.limit += 50;
      };

      $scope.$watch('hits', (hits: any) => {
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
}
