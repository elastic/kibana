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

        const sortOrder = $scope.sortOrder;
        const defaultClass = ['fa', 'fa-sort-up', 'kbnDocTableHeader__sortChange'];

        if (!sortOrder || column !== sortOrder[0]) return defaultClass;
        return ['fa', sortOrder[1] === 'asc' ? 'fa-sort-up' : 'fa-sort-down'];
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

        const [currentColumnName, currentDirection = 'asc'] = $scope.sortOrder;
        const newDirection = (
          (columnName === currentColumnName && currentDirection === 'asc')
            ? 'desc'
            : 'asc'
        );

        $scope.onChangeSortOrder(columnName, newDirection);
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
