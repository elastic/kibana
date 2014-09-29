define(function (require) {
  var angular = require('angular');
  var html = require('text!apps/discover/partials/table.html');
  var detailsHtml = require('text!apps/discover/partials/row_details.html');
  var moment = require('moment');
  var htmlEscape = require('utils/html_escape');

  var _ = require('lodash');
  var $ = require('jquery');

  require('directives/truncated');
  require('directives/infinite_scroll');

  var module = require('modules').get('app/discover');

  module.directive('kbnTableHeader', function () {
    var headerHtml = require('text!apps/discover/partials/table_header.html');
    return {
      restrict: 'A',
      scope: {
        columns: '=',
        sorting: '=',
        mapping: '=',
        timefield: '=?'
      },
      template: headerHtml,
      controller: function ($scope) {
        $scope.headerClass = function (column) {
          if (!$scope.mapping) return;
          if ($scope.mapping[column] && !$scope.mapping[column].indexed) return;

          var sorting = $scope.sorting;
          var defaultClass = ['fa', 'fa-sort', 'table-header-sortchange'];

          if (!sorting) return defaultClass;

          if (column === sorting[0]) {
            return ['fa', sorting[1] === 'asc' ? 'fa-sort-up' : 'fa-sort-down'];
          } else {
            return defaultClass;
          }
        };

        $scope.moveLeft = function (column) {
          var index = _.indexOf($scope.columns, column);
          if (index === 0) return;

          _.move($scope.columns, index, --index);
        };

        $scope.moveRight = function (column) {
          var index = _.indexOf($scope.columns, column);
          if (index === $scope.columns.length - 1) return;

          _.move($scope.columns, index, ++index);
        };

        $scope.sort = function (column) {
          if ($scope.mapping[column] && !$scope.mapping[column].indexed) return;
          var sorting = $scope.sorting || [];
          $scope.sorting = [column, sorting[1] === 'asc' ? 'desc' : 'asc'];
        };

      }
    };
  });



  /**
   * kbnTable directive
   *
   * displays results in a simple table view. Pass the result object
   * via the results attribute on the kbnTable element:
   * ```
   * <kbn-table columns="columnsToDisplay" rows="rowsToDisplay"></kbn-table>
   * ```
   */
  module.directive('kbnTable', function (config) {
    return {
      restrict: 'E',
      template: html,
      scope: {
        fields: '=',
        columns: '=',
        rows: '=',
        sorting: '=',
        filtering: '=',
        refresh: '=',
        mapping: '=',
        timefield: '=?'
      },
      link: function ($scope, element) {
        $scope.limit = 50;
        $scope.addRows = function () {
          if ($scope.limit < config.get('discover:sampleSize')) {
            $scope.limit = $scope.limit + 50;
          }
        };
      }
    };
  });


  /**
   * kbnTableRow directive
   *
   * Display a row in the table
   * ```
   * <tr ng-repeat="row in rows" kbn-table-row="row"></tr>
   * ```
   */
  module.directive('kbnTableRow', function ($compile, config, $filter) {
    // base class for all dom nodes
    var DOMNode = window.Node;

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

        var init = function () {
          createSummaryRow($scope.row, $scope.row._id);
        };

        // track a list of id's that are currently open, so that
        // render can easily render in the same current state
        var opened = [];

        // whenever we compile, we should create a child scope that we can then detroy
        var $child;

        // toggle display of the rows details, a full list of the fields from each row
        $scope.toggleRow = function () {
          var row = $scope.row;
          var id = row._id;

          $scope.open = !$scope.open;

          var $tr = $el;
          var $detailsTr = $tr.next();

          ///
          // add/remove $details children
          ///

          $detailsTr.toggle($scope.open);

          if (!$scope.open) {
            // close the child scope if it exists
            $child.$destroy();
            // no need to go any further
            return;
          } else {
            $child = $scope.$new();
          }

          // The fields to loop over
          row._fields = row._fields || _.keys(row._source).concat(config.get('metaFields')).sort();
          row._mode = 'table';

          // empty the details and rebuild it
          $detailsTr
            .empty()
            .append(
              $('<td>').attr('colspan', $scope.columns.length + 2).append(detailsHtml)
            );

          var showFilters = function (mapping) {
            var validTypes = ['string', 'number', 'date', 'ip'];
            if (!mapping.indexed) return false;
            return _.contains(validTypes, mapping.type);
          };

          $child.row = row;
          $child.showFilters = showFilters;

          $compile($detailsTr)($child);
        };

        $scope.filter = function (row, field, operation) {
          $scope.filtering(field, row._source[field] || row[field], operation);
        };

        $scope.$watchCollection('columns', function (columns) {
          createSummaryRow($scope.row, $scope.row._id);
        });

        $scope.$watch('timefield', function (timefield) {
          createSummaryRow($scope.row, $scope.row._id);
        });

        // expected state of the row's html, needs to be kept in sync so that we can properly diff
        // new html
        var currentHtml = [];

        // create a tr element that lists the value for each *column*
        function createSummaryRow(row, id) {

          // We just create a string here because its faster.
          var html = [
            '<td ng-click="toggleRow()" >' +
              '<i class="fa fa-caret-down"></i>' +
            '</td>'
          ];

          if ($scope.timefield) {
            html.push(
              '<td class="discover-table-timefield" width="1%">' +
                _displayField(row, $scope.timefield) +
              '</td>'
            );
          }

          $scope.columns.forEach(function (column) {
            html.push('<td>' + _displayField(row, column, true) + '</td>');
          });

          function swap(i) {
            var $children = $el.children();
            var $back = $children.eq(i);
            var $front = $children.eq(i + 1);

            $front.after($back.detach());
            currentHtml.splice(i, 0, currentHtml.splice(i, 1));
          }

          function add(i) {
            var $after = $el.children().eq(i);
            if ($after.size()) {
              $after.after(html[i]);
              currentHtml.splice(i, 0, html[i]);
            } else {
              $el.append(html[i]);
              currentHtml.push(html[i]);
            }
          }

          function remove(i) {
            $el.children().eq(i).remove();
          }

          function replace(i) {
            var $target = $el.children().eq(i);
            if ($target.size()) $target.replaceWith(html[i]);
            else $el.append(html[i]);

            currentHtml[i] = html[i];
          }

          for (var i = 0; i < html.length; i++) {
            var update = html[i];
            var nextUpdate = html[i + 1];

            var cur = currentHtml[i];
            var nextCur = currentHtml[i + 1];

            var noChange = update === cur;
            var backMovedForward = update === nextCur;
            var forwardMovedBack = nextUpdate === cur;

            if (noChange) continue;
            else if (forwardMovedBack && backMovedForward) swap(i);
            else if (forwardMovedBack) add(i);
            else if (backMovedForward) remove(i);
            else replace(i);
          }

          currentHtml = html;
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
              return '<div class="truncate-by-height">' + newText + '</div>';
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
