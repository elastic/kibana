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
import { shortenDottedString } from '../../../../common/utils/shorten_dotted_string';
import headerHtml from './table_header.html';
import { uiModules } from 'ui/modules';
const module = uiModules.get('app/discover');


module.directive('kbnTableHeader', function () {
  return {
    restrict: 'A',
    scope: {
      columns: '=',
      sortOrder: '=',
      indexPattern: '=',
      onChangeSortOrder: '=?',
      onRemoveColumn: '=?',
      onMoveColumn: '=?',
    },
    template: headerHtml,
    controller: function ($scope, config) {
      $scope.hideTimeColumn = config.get('doc_table:hideTimeColumn');
      $scope.isShortDots = config.get('shortDots:enable');

      $scope.getShortDotsName = function getShortDotsName(columnName) {
        return $scope.isShortDots ? shortenDottedString(columnName) : columnName;
      };

      $scope.isSortableColumn = function isSortableColumn(columnName) {
        return (
          !!$scope.indexPattern
          && _.isFunction($scope.onChangeSortOrder)
          && _.get($scope, ['indexPattern', 'fields', 'byName', columnName, 'sortable'], false)
        );
      };

      $scope.tooltip = function (column) {
        if (!$scope.isSortableColumn(column)) return '';
        const name = $scope.isShortDots ? shortenDottedString(column) : column;
        return i18n.translate('kbn.docTable.tableHeader.sortByColumnTooltip', {
          defaultMessage: 'Sort by {columnName}',
          values: { columnName: name },
        });
      };

      $scope.canMoveColumnLeft = function canMoveColumn(columnName) {
        return (
          _.isFunction($scope.onMoveColumn)
          && $scope.columns.indexOf(columnName) > 0
        );
      };

      $scope.canMoveColumnRight = function canMoveColumn(columnName) {
        return (
          _.isFunction($scope.onMoveColumn)
          && $scope.columns.indexOf(columnName) < $scope.columns.length - 1
        );
      };

      $scope.canRemoveColumn = function canRemoveColumn(columnName) {
        return (
          _.isFunction($scope.onRemoveColumn)
          && (columnName !== '_source' || $scope.columns.length > 1)
        );
      };

      $scope.headerClass = function (column) {
        if (!$scope.isSortableColumn(column)) return;

        const defaultClass = ['fa', 'fa-sort', 'kbnDocTableHeader__sortChange'];
        const sortOrder = $scope.sortOrder || [];
        const columnSortOrder = sortOrder.find((sortPair) => column === sortPair[0]);

        if (!columnSortOrder) return defaultClass;
        return ['fa', columnSortOrder[1] === 'asc' ? 'fa-sort-up' : 'fa-sort-down'];
      };

      $scope.moveColumnLeft = function moveLeft(columnName) {
        const newIndex = $scope.columns.indexOf(columnName) - 1;

        if (newIndex < 0) {
          return;
        }

        $scope.onMoveColumn(columnName, newIndex);
      };

      $scope.moveColumnRight = function moveRight(columnName) {
        const newIndex = $scope.columns.indexOf(columnName) + 1;

        if (newIndex >= $scope.columns.length) {
          return;
        }

        $scope.onMoveColumn(columnName, newIndex);
      };

      $scope.cycleSortOrder = function cycleSortOrder(columnName) {
        if (!$scope.isSortableColumn(columnName)) {
          return;
        }

        const sortPair = $scope.sortOrder.find((pair) => pair[0] === columnName);

        // Cycle goes Unsorted -> Asc -> Desc -> Unsorted
        if (sortPair === undefined) {
          $scope.onChangeSortOrder([[columnName, 'asc'], ...$scope.sortOrder]);
        }
        else if (sortPair[1] === 'asc') {
          $scope.onChangeSortOrder([[columnName, 'desc'], ...$scope.sortOrder.filter((pair) => pair[0] !== columnName)]);
        }
        else if (sortPair[1] === 'desc' && $scope.sortOrder.length === 1) {
          // If we're at the end of the cycle and this is the only existing sort, we switch
          // back to ascending sort instead of removing it.
          $scope.onChangeSortOrder([[columnName, 'asc']]);
        }
        else {
          $scope.onChangeSortOrder($scope.sortOrder.filter((pair) => pair[0] !== columnName));
        }
      };

      $scope.getAriaLabelForColumn = function getAriaLabelForColumn(name) {
        if (!$scope.isSortableColumn(name)) return null;

        const [currentColumnName, currentDirection = 'asc'] = $scope.sortOrder;
        if(name === currentColumnName && currentDirection === 'asc') {
          return i18n.translate('kbn.docTable.tableHeader.sortByColumnDescendingAriaLabel', {
            defaultMessage: 'Sort {columnName} descending',
            values: { columnName: name },
          });
        }
        return i18n.translate('kbn.docTable.tableHeader.sortByColumnAscendingAriaLabel', {
          defaultMessage: 'Sort {columnName} ascending',
          values: { columnName: name },
        });
      };
    }
  };
});
