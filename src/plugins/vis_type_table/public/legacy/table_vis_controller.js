/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { assign } from 'lodash';

export function TableVisController($scope) {
  const uiStateSort = $scope.uiState ? $scope.uiState.get('vis.params.sort') : {};
  assign($scope.visParams.sort, uiStateSort);

  $scope.sort = $scope.visParams.sort;
  $scope.$watchCollection('sort', function (newSort) {
    $scope.uiState.set('vis.params.sort', newSort);
  });

  /**
   * Recreate the entire table when:
   * - the underlying data changes (esResponse)
   * - one of the view options changes (vis.params)
   */
  $scope.$watch('renderComplete', function () {
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
