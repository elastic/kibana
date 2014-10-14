define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');
  var htmlEscape = require('utils/html_escape');
  var module = require('modules').get('app/discover');

  /**
   * kbnTableRow directive
   *
   * Display a row in the table
   * ```
   * <tr ng-repeat="row in rows" kbn-table-row="row"></tr>
   * ```
   */
  module.directive('kbnTableRow', function ($compile, config) {
    var openRowHtml = require('text!plugins/discover/partials/table_row/open.html');
    var detailsHtml = require('text!plugins/discover/partials/table_row/details.html');
    var cellTemplate = _.template(require('text!plugins/discover/partials/table_row/cell.html'));
    var truncateByHeightTemplate = _.template(require('text!partials/truncate_by_height.html'));

    return {
      restrict: 'A',
      scope: {
        columns: '=',
        filtering: '=',
        mapping: '=',
        timefield: '=?',
        row: '=kbnTableRow'
      },
      link: function ($scope, $el, attrs) {
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
          var row = $scope.row;

          $scope.open = !$scope.open;

          var $tr = $el;
          var $detailsTr = $tr.next();

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

          // The fields to loop over
          row._fields = row._fields || _.keys(row._source).concat(config.get('metaFields')).sort();
          row._mode = 'table';

          // empty the details and rebuild it
          $detailsTr.html(detailsHtml);

          $detailsScope.row = row;
          $detailsScope.showFilters = function (mapping) {
            var validTypes = ['string', 'number', 'date', 'ip'];
            if (!mapping.indexed) return false;
            return _.contains(validTypes, mapping.type);
          };

          $compile($detailsTr)($detailsScope);
        };

        $scope.filter = function (row, field, operation) {
          $scope.filtering(field, row._source[field] || row[field], operation);
        };

        $scope.$watchCollection('columns', function () {
          createSummaryRow($scope.row, $scope.row._id);
        });

        $scope.$watch('timefield', function () {
          createSummaryRow($scope.row, $scope.row._id);
        });

        // create a tr element that lists the value for each *column*
        function createSummaryRow(row) {
          // We just create a string here because its faster.
          var newHtmls = [
            openRowHtml
          ];

          if ($scope.timefield) {
            newHtmls.push(cellTemplate({
              timefield: true,
              formatted: _displayField(row, $scope.timefield)
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

          // trim off cells that were not used rest of the cells
          $cells.filter(':gt(' + (newHtmls.length - 1) + ')').remove();
        }

        /**
         * Fill an element with the value of a field
         */
        function _displayField(row, field, breakWords) {
          var text = _getValForField(row, field);
          var minLineLength = 20;


          if (breakWords) {
            text = htmlEscape(text);
            var lineSize = 0;
            var newText = '';
            for (var i = 0, len = text.length; i < len; i++) {
              var chr = text.charAt(i);
              newText += chr;

              switch (chr) {
              case ' ':
              case '&':
              case ';':
              case ':':
              case ',':
                // natural line break, reset line size
                lineSize = 0;
                break;
              default:
                lineSize++;
                break;
              }

              if (lineSize > minLineLength) {
                // continuous text is longer then we want,
                // so break it up with a <wbr>
                lineSize = 0;
                newText += '<wbr>';
              }
            }

            if (text.length > minLineLength) {
              return truncateByHeightTemplate({
                body: newText
              });
            }

            text = newText;
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

          // discover formats all of the values and puts them in _formatted for display
          val = row._formatted[field] || row[field];

          // undefined and null should just be an empty string
          val = (val == null) ? '' : val;

          return val;
        }

        init();
      }
    };
  });
});