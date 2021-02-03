/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { move } from './collection';
import { initTimelionGridDirective } from '../timelion_grid';

import html from './cells.html';

export function initCellsDirective(app) {
  initTimelionGridDirective(app);

  app.directive('timelionCells', function () {
    return {
      restrict: 'E',
      scope: {
        sheet: '=',
        state: '=',
        transient: '=',
        onSearch: '=',
        onSelect: '=',
        onRemoveSheet: '=',
      },
      template: html,
      link: function ($scope) {
        $scope.removeCell = function (index) {
          $scope.onRemoveSheet(index);
        };

        $scope.dropCell = function (item, partFrom, partTo, indexFrom, indexTo) {
          move($scope.sheet, indexFrom, indexTo);
          $scope.onSelect(indexTo);
        };
      },
    };
  });
}
