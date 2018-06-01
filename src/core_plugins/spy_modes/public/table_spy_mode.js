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

// import 'ui/agg_table';
import { tabifyAggResponse } from 'ui/agg_response/tabify/tabify';
import tableSpyModeTemplate from './table_spy_mode.html';
import { SpyModesRegistryProvider } from 'ui/registry/spy_modes';

function VisSpyTableProvider(Notifier, $filter, $rootScope) {
  const PER_PAGE_DEFAULT = 10;

  return {
    name: 'table',
    display: 'Table',
    order: 1,
    template: tableSpyModeTemplate,
    showMode: vis => vis.type.requestHandler === 'courier' && vis.type.requiresSearch,
    link: function tableLinkFn($scope) {
      $rootScope.$watchMulti.call($scope, [
        'vis',
        'searchSource.rawResponse'
      ], function () {
        if (!$scope.vis || !$scope.searchSource.rawResponse) {
          $scope.table = null;
        } else {
          $scope.rowsPerPage = PER_PAGE_DEFAULT;

          $scope.table = tabifyAggResponse($scope.vis.getAggConfig().getResponseAggs(), $scope.searchSource.rawResponse, {
            canSplit: false,
            asAggConfigResults: true,
            partialRows: true,
            isHierarchical: $scope.vis.isHierarchical()
          });
        }
      });
    }
  };
}

SpyModesRegistryProvider.register(VisSpyTableProvider);
