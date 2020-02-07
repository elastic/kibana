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
import { assign } from 'lodash';

export function TableVisController($scope) {
  const uiStateSort = $scope.uiState ? $scope.uiState.get('vis.params.sort') : {};
  assign($scope.visParams.sort, uiStateSort);

  $scope.sort = $scope.visParams.sort;
  $scope.$watchCollection('sort', function(newSort) {
    $scope.uiState.set('vis.params.sort', newSort);
  });

  /**
   * Recreate the entire table when:
   * - the underlying data changes (esResponse)
   * - one of the view options changes (vis.params)
   */
  $scope.$watch('renderComplete', function() {
    let tableGroups = ($scope.tableGroups = null);
    let hasSomeRows = ($scope.hasSomeRows = null);

    if ($scope.esResponse) {
      tableGroups = $scope.esResponse;

      hasSomeRows = tableGroups.tables.some(function haveRows(table) {
        if (table.tables) return table.tables.some(haveRows);
        return table.rows.length > 0;
      });
    }

    $scope.hasSomeRows = hasSomeRows;
    if (hasSomeRows) {
      $scope.dimensions = $scope.visParams.dimensions;
      $scope.tableGroups = tableGroups;
    }
    $scope.renderComplete();
  });
}
