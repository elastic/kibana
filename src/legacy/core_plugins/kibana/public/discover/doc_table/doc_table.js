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
import { i18n } from '@kbn/i18n';
import html from './doc_table.html';
import { getSort } from './lib/get_sort';
import './infinite_scroll';
import './components/table_header';
import './components/table_row';
import { dispatchRenderComplete } from 'ui/render_complete';
import { uiModules } from 'ui/modules';
import 'ui/pager_control';
import 'ui/pager';
import { getRequestInspectorStats, getResponseInspectorStats } from 'ui/courier/utils/courier_inspector_utils';
import { toastNotifications } from 'ui/notify';

import { getLimitedSearchResultsMessage } from './doc_table_strings';

uiModules.get('app/discover')
  .directive('docTable', function (config, getAppState, pagerFactory, $filter, courier) {
    return {
      restrict: 'E',
      template: html,
      scope: {
        sorting: '=',
        columns: '=',
        hits: '=?', // You really want either hits & indexPattern, OR searchSource
        indexPattern: '=?',
        searchSource: '=?',
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
      link: function ($scope, $el) {
        $scope.$watch('minimumVisibleRows', (minimumVisibleRows) => {
          $scope.limit = Math.max(minimumVisibleRows || 50, $scope.limit || 50);
        });

        $scope.persist = {
          sorting: $scope.sorting,
          columns: $scope.columns
        };

        const limitTo = $filter('limitTo');
        const calculateItemsOnPage = () => {
          $scope.pager.setTotalItems($scope.hits.length);
          $scope.pageOfItems = limitTo($scope.hits, $scope.pager.pageSize, $scope.pager.startIndex);
        };

        $scope.limitedResultsWarning = getLimitedSearchResultsMessage(config.get('discover:sampleSize'));

        $scope.addRows = function () {
          $scope.limit += 50;
        };

        // This exists to fix the problem of an empty initial column list not playing nice with watchCollection.
        $scope.$watch('columns', function (columns) {
          if (columns.length !== 0) return;

          const $state = getAppState();
          $scope.columns.push('_source');
          if ($state) $state.replace();
        });

        $scope.$watchCollection('columns', function (columns, oldColumns) {
          if (oldColumns.length === 1 && oldColumns[0] === '_source' && $scope.columns.length > 1) {
            _.pull($scope.columns, '_source');
          }

          if ($scope.columns.length === 0) $scope.columns.push('_source');
        });

        $scope.$watch('searchSource', function () {
          if (!$scope.searchSource) return;

          $scope.indexPattern = $scope.searchSource.getField('index');

          $scope.searchSource.setField('size', config.get('discover:sampleSize'));
          $scope.searchSource.setField('sort', getSort($scope.sorting, $scope.indexPattern));

          // Set the watcher after initialization
          $scope.$watchCollection('sorting', function (newSort, oldSort) {
          // Don't react if sort values didn't really change
            if (newSort === oldSort) return;
            $scope.searchSource.setField('sort', getSort(newSort, $scope.indexPattern));
            $scope.searchSource.fetchQueued();
          });

          $scope.$on('$destroy', function () {
            if ($scope.searchSource) $scope.searchSource.destroy();
          });

          function onResults(resp) {
          // Reset infinite scroll limit
            $scope.limit = 50;

            // Abort if something changed
            if ($scope.searchSource !== $scope.searchSource) return;

            $scope.hits = resp.hits.hits;
            if ($scope.hits.length === 0) {
              dispatchRenderComplete($el[0]);
            }
            // We limit the number of returned results, but we want to show the actual number of hits, not
            // just how many we retrieved.
            $scope.totalHitCount = resp.hits.total;
            $scope.pager = pagerFactory.create($scope.hits.length, 50, 1);
            calculateItemsOnPage();

            return $scope.searchSource.onResults().then(onResults);
          }

          function startSearching() {
            let inspectorRequest = undefined;
            if (_.has($scope, 'inspectorAdapters.requests')) {
              $scope.inspectorAdapters.requests.reset();
              const title = i18n.translate('kbn.docTable.inspectorRequestDataTitle', {
                defaultMessage: 'Data',
              });
              const description = i18n.translate('kbn.docTable.inspectorRequestDescription', {
                defaultMessage: 'This request queries Elasticsearch to fetch the data for the search.',
              });
              inspectorRequest = $scope.inspectorAdapters.requests.start(title, { description });
              inspectorRequest.stats(getRequestInspectorStats($scope.searchSource));
              $scope.searchSource.getSearchRequestBody().then(body => {
                inspectorRequest.json(body);
              });
            }
            $scope.searchSource.onResults()
              .then(resp => {
                if (inspectorRequest) {
                  inspectorRequest
                    .stats(getResponseInspectorStats($scope.searchSource, resp))
                    .ok({ json: resp });
                }
                return resp;
              })
              .then(onResults)
              .catch(error => {
                toastNotifications.addError(error, {
                  title: i18n.translate('kbn.docTable.errorTitle', {
                    defaultMessage: 'Error fetching data'
                  }),
                });
                startSearching();
              });
          }
          startSearching();
          courier.fetch();
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

        $scope.shouldShowLimitedResultsWarning = () => (
          !$scope.pager.hasNextPage && $scope.pager.totalItems < $scope.totalHitCount
        );
      }
    };
  });
