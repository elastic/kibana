define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');
  var addWordBreaks = require('utils/add_word_breaks');
  var module = require('modules').get('app/discover');

  require('components/highlight/highlight');
  require('components/highlight/highlight_tags');
  require('components/doc_viewer/doc_viewer');
  require('filters/trust_as_html');
  require('filters/short_dots');


  // guesstimate at the minimum number of chars wide cells in the table should be
  var MIN_LINE_LENGTH = 20;

  /**
   * kbnTableRow directive
   *
   * Display a row in the table
   * ```
   * <tr ng-repeat="row in rows" kbn-table-row="row"></tr>
   * ```
   */
  module.directive('kbnTableRow', function ($compile, highlightFilter) {
    var openRowHtml = require('text!components/doc_table/components/table_row/open.html');
    var detailsHtml = require('text!components/doc_table/components/table_row/details.html');
    var cellTemplate = _.template(require('text!components/doc_table/components/table_row/cell.html'));
    var truncateByHeightTemplate = _.template(require('text!partials/truncate_by_height.html'));

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

        var init = function () {
          createSummaryRow($scope.row, $scope.row._id);
        };

        // when we compile the details, we use this $scope
        var $detailsScope;

        // when we compile the toggle button in the summary, we use this $scope
        var $toggleScope;

        // toggle display of the rows details, a full list of the fields from each row
        $scope.toggleRow = function () {
          var $detailsTr = $el.next();

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
          var indexPattern = $scope.indexPattern;

          // We just create a string here because its faster.
          var newHtmls = [
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
              formatted: _displayField(row, column, true)
            }));
          });

          var $cells = $el.children();
          newHtmls.forEach(function (html, i) {
            var $cell = $cells.eq(i);
            if ($cell.data('discover:html') === html) return;

            var reuse = _.find($cells.slice(i + 1), function (cell) {
              return $.data(cell, 'discover:html') === html;
            });

            var $target = reuse ? $(reuse).detach() : $(html);
            $target.data('discover:html', html);
            var $before = $cells.eq(i - 1);
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
          var indexPattern = $scope.indexPattern;

          if (fieldName === '_source') {
            if (!row.$$_formattedSource) {
              var field = indexPattern.fields.byName._source;
              var converter = field.format.getConverterFor('html');
              row.$$_formattedSource = converter(row._source, indexPattern, row);
            }
            return row.$$_formattedSource;
          }

          var text = indexPattern.formatField(row, fieldName);
          text = highlightFilter(text, row.highlight && row.highlight[fieldName]);

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
