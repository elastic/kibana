/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { find } from 'lodash';
import $ from 'jquery';
import openRowHtml from './table_row/open.html';
import detailsHtml from './table_row/details.html';
import { dispatchRenderComplete } from '../../../../../../kibana_utils/public';
import { DOC_HIDE_TIME_COLUMN_SETTING } from '../../../../../common';
import { getServices } from '../../../../kibana_services';
import { getContextUrl } from '../../../helpers/get_context_url';
import { formatRow, formatTopLevelObject } from '../../helpers';
import { truncateByHeight } from './table_row/truncate_by_height';
import { cell } from './table_row/cell';

// guesstimate at the minimum number of chars wide cells in the table should be
const MIN_LINE_LENGTH = 20;

interface LazyScope extends ng.IScope {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export function createTableRowDirective($compile: ng.ICompileService) {
  return {
    restrict: 'A',
    scope: {
      columns: '=',
      filter: '=',
      indexPattern: '=',
      row: '=kbnTableRow',
      onAddColumn: '=?',
      onRemoveColumn: '=?',
      useNewFieldsApi: '<',
      showMultiFields: '<',
    },
    link: ($scope: LazyScope, $el: JQuery) => {
      $el.after('<tr data-test-subj="docTableDetailsRow" class="kbnDocTableDetails__row">');
      $el.empty();

      // when we compile the details, we use this $scope
      let $detailsScope: LazyScope;

      // when we compile the toggle button in the summary, we use this $scope
      let $toggleScope;

      // toggle display of the rows details, a full list of the fields from each row
      $scope.toggleRow = () => {
        const $detailsTr = $el.next();

        $scope.open = !$scope.open;

        ///
        // add/remove $details children
        ///

        $detailsTr.toggle($scope.open);

        if (!$scope.open) {
          // close the child scope if it exists
          $detailsScope.$destroy();
          // no need to go any further
          return;
        } else {
          $detailsScope = $scope.$new();
        }

        // empty the details and rebuild it
        $detailsTr.html(detailsHtml);
        $detailsScope.row = $scope.row;
        $detailsScope.hit = $scope.row;
        $detailsScope.uriEncodedId = encodeURIComponent($detailsScope.hit._id);

        $compile($detailsTr)($detailsScope);
      };

      $scope.$watchMulti(['indexPattern.timeFieldName', 'row.highlight', '[]columns'], () => {
        createSummaryRow($scope.row);
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $scope.inlineFilter = function inlineFilter($event: any, type: string) {
        const column = $($event.currentTarget).data().column;
        const field = $scope.indexPattern.fields.getByName(column);
        $scope.filter(field, $scope.flattenedRow[column], type);
      };

      $scope.getContextAppHref = () => {
        return getContextUrl(
          $scope.row._id,
          $scope.indexPattern.id,
          $scope.columns,
          getServices().filterManager,
          getServices().addBasePath
        );
      };

      $scope.getSingleDocHref = () => {
        return getServices().addBasePath(
          `/app/discover#/doc/${$scope.indexPattern.id}/${
            $scope.row._index
          }?id=${encodeURIComponent($scope.row._id)}`
        );
      };

      // create a tr element that lists the value for each *column*
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function createSummaryRow(row: any) {
        const indexPattern = $scope.indexPattern;
        $scope.flattenedRow = indexPattern.flattenHit(row);

        // We just create a string here because its faster.
        const newHtmls = [openRowHtml];

        const mapping = indexPattern.fields.getByName;
        const hideTimeColumn = getServices().uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING, false);
        if (indexPattern.timeFieldName && !hideTimeColumn) {
          newHtmls.push(
            cell({
              timefield: true,
              formatted: _displayField(row, indexPattern.timeFieldName),
              filterable: mapping(indexPattern.timeFieldName).filterable && $scope.filter,
              column: indexPattern.timeFieldName,
            })
          );
        }

        if ($scope.columns.length === 0 && $scope.useNewFieldsApi) {
          const formatted = formatRow(row, indexPattern);

          newHtmls.push(
            cell({
              timefield: false,
              sourcefield: true,
              formatted,
              filterable: false,
              column: '__document__',
            })
          );
        } else {
          $scope.columns.forEach(function (column: string) {
            const isFilterable = mapping(column) && mapping(column).filterable && $scope.filter;
            if ($scope.useNewFieldsApi && !mapping(column) && !row.fields[column]) {
              const innerColumns = Object.fromEntries(
                Object.entries(row.fields).filter(([key]) => {
                  return key.indexOf(`${column}.`) === 0;
                })
              );
              newHtmls.push(
                cell({
                  timefield: false,
                  sourcefield: true,
                  formatted: formatTopLevelObject(row, innerColumns, indexPattern),
                  filterable: false,
                  column,
                })
              );
            } else {
              newHtmls.push(
                cell({
                  timefield: false,
                  sourcefield: column === '_source',
                  formatted: _displayField(row, column, true),
                  filterable: isFilterable,
                  column,
                })
              );
            }
          });
        }

        let $cells = $el.children();
        newHtmls.forEach(function (html, i) {
          const $cell = $cells.eq(i);
          if ($cell.data('discover:html') === html) return;

          const reuse = find($cells.slice(i + 1), (c) => {
            return $.data(c, 'discover:html') === html;
          });

          const $target = reuse ? $(reuse).detach() : $(html);
          $target.data('discover:html', html);
          const $before = $cells.eq(i - 1);
          if ($before.length) {
            $before.after($target);
          } else {
            $el.append($target);
          }

          // rebuild cells since we modified the children
          $cells = $el.children();

          if (!reuse) {
            $toggleScope = $scope.$new();
            $compile($target)($toggleScope);
          }
        });

        if ($scope.open) {
          $detailsScope.row = row;
        }

        // trim off cells that were not used rest of the cells
        $cells.filter(':gt(' + (newHtmls.length - 1) + ')').remove();
        dispatchRenderComplete($el[0]);
      }

      /**
       * Fill an element with the value of a field
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function _displayField(row: any, fieldName: string, truncate = false) {
        const indexPattern = $scope.indexPattern;
        const text = indexPattern.formatField(row, fieldName);

        if (truncate && text.length > MIN_LINE_LENGTH) {
          return truncateByHeight({
            body: text,
          });
        }

        return text;
      }
    },
  };
}
