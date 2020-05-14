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

import $ from 'jquery';
import _ from 'lodash';
import tableCellFilterHtml from './table_cell_filter.html';

export function KbnRows($compile) {
  return {
    restrict: 'A',
    link: function($scope, $el, attr) {
      function addCell($tr, contents, column, row) {
        function createCell() {
          return $(document.createElement('td'));
        }

        function createFilterableCell(value) {
          const $template = $(tableCellFilterHtml);
          $template.addClass('kbnTableCellFilter__hover');

          const scope = $scope.$new();

          scope.onFilterClick = (event, negate) => {
            // Don't add filter if a link was clicked.
            if ($(event.target).is('a')) {
              return;
            }

            $scope.filter({
              data: [
                {
                  table: $scope.table,
                  row: $scope.rows.findIndex(r => r === row),
                  column: $scope.table.columns.findIndex(c => c.id === column.id),
                  value,
                },
              ],
              negate,
            });
          };

          return $compile($template)(scope);
        }

        let $cell;
        let $cellContent;

        const contentsIsDefined = contents !== null && contents !== undefined;

        if (column.filterable && contentsIsDefined) {
          $cell = createFilterableCell(contents);
          $cellContent = $cell.find('[data-cell-content]');
        } else {
          $cell = $cellContent = createCell();
        }

        // An AggConfigResult can "enrich" cell contents by applying a field formatter,
        // which we want to do if possible.
        contents = contentsIsDefined ? column.formatter.convert(contents, 'html') : '';

        if (_.isObject(contents)) {
          if (contents.attr) {
            $cellContent.attr(contents.attr);
          }

          if (contents.class) {
            $cellContent.addClass(contents.class);
          }

          if (contents.scope) {
            $cellContent = $compile($cellContent.prepend(contents.markup))(contents.scope);
          } else {
            $cellContent.prepend(contents.markup);
          }

          if (contents.attr) {
            $cellContent.attr(contents.attr);
          }
        } else {
          if (contents === '') {
            $cellContent.prepend('&nbsp;');
          } else {
            $cellContent.prepend(contents);
          }
        }

        $tr.append($cell);
      }

      $scope.$watchMulti([attr.kbnRows, attr.kbnRowsMin], function(vals) {
        let rows = vals[0];
        const min = vals[1];

        $el.empty();

        if (!Array.isArray(rows)) rows = [];

        if (isFinite(min) && rows.length < min) {
          // clone the rows so that we can add elements to it without upsetting the original
          rows = _.clone(rows);
          // crate the empty row which will be pushed into the row list over and over
          const emptyRow = {};
          // push as many empty rows into the row array as needed
          _.times(min - rows.length, function() {
            rows.push(emptyRow);
          });
        }

        rows.forEach(function(row) {
          const $tr = $(document.createElement('tr')).appendTo($el);
          $scope.columns.forEach(column => {
            const value = row[column.id];
            addCell($tr, value, column, row);
          });
        });
      });
    },
  };
}
