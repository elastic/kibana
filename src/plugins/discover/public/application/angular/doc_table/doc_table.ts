/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
      useNewFieldsApi: '<',
    },
    link: ($scope: LazyScope, $el: JQuery) => {
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
        $scope.limit = $scope.minimumVisibleRows || 50;

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
