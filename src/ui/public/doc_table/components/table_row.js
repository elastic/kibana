import _ from 'lodash';
import $ from 'jquery';
import rison from 'rison-node';
import 'ui/highlight';
import 'ui/highlight/highlight_tags';
import 'ui/doc_viewer';
import 'ui/filters/trust_as_html';
import 'ui/filters/short_dots';
import './table_row.less';
import noWhiteSpace from 'ui/utils/no_white_space';
import openRowHtml from 'ui/doc_table/components/table_row/open.html';
import detailsHtml from 'ui/doc_table/components/table_row/details.html';
import uiModules from 'ui/modules';
const module = uiModules.get('app/discover');



// guesstimate at the minimum number of chars wide cells in the table should be
const MIN_LINE_LENGTH = 20;

/**
 * kbnTableRow directive
 *
 * Display a row in the table
 * ```
 * <tr ng-repeat="row in rows" kbn-table-row="row"></tr>
 * ```
 */
module.directive('kbnTableRow', function ($compile, $httpParamSerializer, kbnUrl) {
  const cellTemplate = _.template(noWhiteSpace(require('ui/doc_table/components/table_row/cell.html')));
  const truncateByHeightTemplate = _.template(noWhiteSpace(require('ui/partials/truncate_by_height.html')));

  return {
    restrict: 'A',
    scope: {
      columns: '=',
      filter: '=',
      indexPattern: '=',
      row: '=kbnTableRow',
      onAddColumn: '=?',
      onRemoveColumn: '=?',
    },
    link: function ($scope, $el) {
      $el.after('<tr>');
      $el.empty();

      // when we compile the details, we use this $scope
      let $detailsScope;

      // when we compile the toggle button in the summary, we use this $scope
      let $toggleScope;

      // toggle display of the rows details, a full list of the fields from each row
      $scope.toggleRow = function () {
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

        $compile($detailsTr)($detailsScope);
      };

      $scope.$watchMulti([
        'indexPattern.timeFieldName',
        'row.highlight',
        '[]columns'
      ], function () {
        createSummaryRow($scope.row, $scope.row._id);
      });

      $scope.inlineFilter = function inlineFilter($event, type) {
        const column = $($event.target).data().column;
        const field = $scope.indexPattern.fields.byName[column];
        $scope.filter(field, $scope.flattenedRow[column], type);
      };

      $scope.getContextAppHref = () => {
        const path = kbnUrl.eval('#/context/{{ indexPattern }}/{{ anchorType }}/{{ anchorId }}', {
          anchorId: $scope.row._id,
          anchorType: $scope.row._type,
          indexPattern: $scope.indexPattern.id,
        });
        const hash = $httpParamSerializer({
          _a: rison.encode({
            columns: $scope.columns,
          }),
        });
        return `${path}?${hash}`;
      };

      // create a tr element that lists the value for each *column*
      function createSummaryRow(row) {
        const indexPattern = $scope.indexPattern;
        $scope.flattenedRow = indexPattern.flattenHit(row);

        // We just create a string here because its faster.
        const newHtmls = [
          openRowHtml
        ];

        const mapping = indexPattern.fields.byName;
        if (indexPattern.timeFieldName) {
          newHtmls.push(cellTemplate({
            timefield: true,
            formatted: _displayField(row, indexPattern.timeFieldName),
            filterable: (
              mapping[indexPattern.timeFieldName].filterable
              && _.isFunction($scope.filter)
            ),
            column: indexPattern.timeFieldName
          }));
        }

        $scope.columns.forEach(function (column) {
          const isFilterable = $scope.flattenedRow[column] !== undefined
            && mapping[column]
            && mapping[column].filterable
            && _.isFunction($scope.filter);

          newHtmls.push(cellTemplate({
            timefield: false,
            sourcefield: (column === '_source'),
            formatted: _displayField(row, column, true),
            filterable: isFilterable,
            column
          }));
        });

        let $cells = $el.children();
        newHtmls.forEach(function (html, i) {
          const $cell = $cells.eq(i);
          if ($cell.data('discover:html') === html) return;

          const reuse = _.find($cells.slice(i + 1), function (cell) {
            return $.data(cell, 'discover:html') === html;
          });

          const $target = reuse ? $(reuse).detach() : $(html);
          $target.data('discover:html', html);
          const $before = $cells.eq(i - 1);
          if ($before.size()) {
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
        $el.trigger('renderComplete');
      }

      /**
       * Fill an element with the value of a field
       */
      function _displayField(row, fieldName, truncate) {
        const indexPattern = $scope.indexPattern;
        const text = indexPattern.formatField(row, fieldName);

        if (truncate && text.length > MIN_LINE_LENGTH) {
          return truncateByHeightTemplate({
            body: text
          });
        }

        return text;
      }
    }
  };
});
