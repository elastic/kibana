define(function (require) {
  let _ = require('lodash');
  let $ = require('jquery');
  let addWordBreaks = require('ui/utils/add_word_breaks');
  let module = require('ui/modules').get('app/discover');

  require('ui/highlight');
  require('ui/highlight/highlight_tags');
  require('ui/doc_viewer');
  require('ui/filters/trust_as_html');
  require('ui/filters/short_dots');


  // guesstimate at the minimum number of chars wide cells in the table should be
  let MIN_LINE_LENGTH = 20;

  /**
   * kbnTableRow directive
   *
   * Display a row in the table
   * ```
   * <tr ng-repeat="row in rows" kbn-table-row="row"></tr>
   * ```
   */
  module.directive('kbnTableRow', function ($compile) {
    let noWhiteSpace = require('ui/utils/no_white_space');
    let openRowHtml = require('ui/doc_table/components/table_row/open.html');
    let detailsHtml = require('ui/doc_table/components/table_row/details.html');
    let cellTemplate = _.template(noWhiteSpace(require('ui/doc_table/components/table_row/cell.html')));
    let truncateByHeightTemplate = _.template(noWhiteSpace(require('ui/partials/truncate_by_height.html')));

    return {
      restrict: 'A',
      scope: {
        columns: '=',
        filter: '=',
        indexPattern: '=',
        row: '=kbnTableRow'
      },
      link: function ($scope, $el) {
        $el.after('<tr>');
        $el.empty();

        let init = function () {
          createSummaryRow($scope.row, $scope.row._id);
        };

        // when we compile the details, we use this $scope
        let $detailsScope;

        // when we compile the toggle button in the summary, we use this $scope
        let $toggleScope;

        // toggle display of the rows details, a full list of the fields from each row
        $scope.toggleRow = function () {
          let $detailsTr = $el.next();

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

        $scope.$watchCollection('columns', function () {
          createSummaryRow($scope.row, $scope.row._id);
        });

        $scope.$watchMulti(['indexPattern.timeFieldName', 'row.highlight'], function () {
          createSummaryRow($scope.row, $scope.row._id);
        });

        // create a tr element that lists the value for each *column*
        function createSummaryRow(row) {
          let indexPattern = $scope.indexPattern;

          // We just create a string here because its faster.
          let newHtmls = [
            openRowHtml
          ];

          if (indexPattern.timeFieldName) {
            newHtmls.push(cellTemplate({
              timefield: true,
              formatted: _displayField(row, indexPattern.timeFieldName)
            }));
          }

          $scope.columns.forEach(function (column) {
            newHtmls.push(cellTemplate({
              timefield: false,
              sourcefield: (column === '_source'),
              formatted: _displayField(row, column, true)
            }));
          });

          let $cells = $el.children();
          newHtmls.forEach(function (html, i) {
            let $cell = $cells.eq(i);
            if ($cell.data('discover:html') === html) return;

            let reuse = _.find($cells.slice(i + 1), function (cell) {
              return $.data(cell, 'discover:html') === html;
            });

            let $target = reuse ? $(reuse).detach() : $(html);
            $target.data('discover:html', html);
            let $before = $cells.eq(i - 1);
            if ($before.size()) {
              $before.after($target);
            } else {
              $el.append($target);
            }

            // rebuild cells since we modified the children
            $cells = $el.children();

            if (i === 0 && !reuse) {
              $toggleScope = $scope.$new();
              $compile($target)($toggleScope);
            }
          });

          if ($scope.open) {
            $detailsScope.row = row;
          }

          // trim off cells that were not used rest of the cells
          $cells.filter(':gt(' + (newHtmls.length - 1) + ')').remove();
        }

        /**
         * Fill an element with the value of a field
         */
        function _displayField(row, fieldName, breakWords) {
          let indexPattern = $scope.indexPattern;
          let text = indexPattern.formatField(row, fieldName);

          if (breakWords) {
            text = addWordBreaks(text, MIN_LINE_LENGTH);

            if (text.length > MIN_LINE_LENGTH) {
              return truncateByHeightTemplate({
                body: text
              });
            }
          }

          return text;
        }

        init();
      }
    };
  });
});
