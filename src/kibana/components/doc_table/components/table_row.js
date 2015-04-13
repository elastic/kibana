define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');
  var addWordBreaks = require('utils/add_word_breaks');
  var noWhiteSpace = require('utils/no_white_space');
  var module = require('modules').get('app/discover');

  require('components/highlight/highlight');
  require('components/highlight/highlight_tags');
  require('components/doc_viewer/doc_viewer');
  require('filters/trust_as_html');
  require('filters/short_dots');


  // guestimate at the minimum number of chars wide cells in the table should be
  var MIN_LINE_LENGTH = 20;

  /**
   * kbnTableRow directive
   *
   * Display a row in the table
   * ```
   * <tr ng-repeat="row in rows" kbn-table-row="row"></tr>
   * ```
   */
  module.directive('kbnTableRow', function ($compile, config, highlightFilter, highlightTags, shortDotsFilter, courier) {
    var openRowHtml = require('text!components/doc_table/components/table_row/open.html');
    var detailsHtml = require('text!components/doc_table/components/table_row/details.html');
    var cellTemplate = _.template(require('text!components/doc_table/components/table_row/cell.html'));
    var truncateByHeightTemplate = _.template(require('text!partials/truncate_by_height.html'));
    var sourceTemplate = _.template(noWhiteSpace(require('text!components/doc_table/components/table_row/_source.html')));

    return {
      restrict: 'A',
      scope: {
        columns: '=',
        filter: '=',
        indexPattern: '=',
        row: '=kbnTableRow'
      },
      link: function ($scope, $el, attrs) {
        $el.after('<tr>');
        $el.empty();

        var init = function () {
          _formatRow($scope.row);
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
          // We just create a string here because its faster.
          var newHtmls = [
            openRowHtml
          ];

          if ($scope.indexPattern.timeFieldName) {
            newHtmls.push(cellTemplate({
              timefield: true,
              formatted: _displayField(row, $scope.indexPattern.timeFieldName)
            }));
          }

          $scope.columns.forEach(function (column) {
            var formatted;

            var sources = _.extend({}, row.$$_formatted, row.highlight);
            if (column === '_source') {
              var sourceConfig = {
                source: _.mapValues(sources, function (val, field) {
                  return _displayField(row, field, false);
                }),
                highlight: row.highlight,
                shortDotsFilter: shortDotsFilter
              };
              formatted = sourceTemplate(sourceConfig);
            } else {
              formatted = _displayField(row, column, true);
            }
            newHtmls.push(cellTemplate({
              timefield: false,
              formatted: formatted
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
        function _displayField(row, field, breakWords) {
          var text = _getValForField(row, field);
          text = highlightFilter(text, row.highlight && row.highlight[field]);

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

        /**
         * get the value of a field from a row, serialize it to a string
         * and truncate it if necessary
         *
         * @param  {object} row - the row to pull the value from
         * @param  {string} field - the name of the field (dot-seperated paths are accepted)
         * @return {[type]} a string, which should be inserted as text, or an element
         */
        function _getValForField(row, field) {
          var val;

          if (row.highlight && row.highlight[field]) {
            // Strip out the highlight tags so we have the "original" value
            var untagged = _.map(row.highlight[field], function (value) {
              return value
                .split(highlightTags.pre).join('')
                .split(highlightTags.post).join('');
            });
            return _formatField(untagged, field);
          }

          // discover formats all of the values and puts them in $$_formatted for display
          val = (row.$$_formatted || _formatRow(row))[field];

          // undefined and null should just be an empty string
          val = (val == null) ? '' : val;

          return val;
        }

        /*
         * Format a field with the index pattern on scope.
         */
        function _formatField(value, name) {
          var defaultFormat = courier.indexPatterns.fieldFormats.defaultByType.string;
          var field = $scope.indexPattern.fields.byName[name];
          var formatter = (field && field.format) ? field.format : defaultFormat;

          return formatter.convert(value);
        }

        /*
         * Create the $$_formatted key on a row
         */
        function _formatRow(row) {
          $scope.indexPattern.flattenHit(row);
          row.$$_formatted = row.$$_formatted || _.mapValues(row.$$_flattened, _formatField);
          return row.$$_formatted;
        }

        init();
      }
    };
  });
});