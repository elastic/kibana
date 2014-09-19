define(function (require) {
  var angular = require('angular');
  var html = require('text!apps/discover/partials/table.html');
  var detailsHtml = require('text!apps/discover/partials/row_details.html');
  var moment = require('moment');

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
        maxLength: '=',
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
  module.directive('kbnTableRow', function ($compile, config) {
    // base class for all dom nodes
    var DOMNode = window.Node;

    return {
      restrict: 'A',
      scope: {
        columns: '=',
        filtering: '=',
        mapping: '=',
        maxLength: '=',
        timefield: '=?',
        row: '=kbnTableRow'
      },
      link: function ($scope, element, attrs) {
        element.after('<tr>');

        var init = function () {
          createSummaryRow($scope.row, $scope.row._id);
        };

        // track a list of id's that are currently open, so that
        // render can easily render in the same current state
        var opened = [];

        // whenever we compile, we should create a child scope that we can then detroy
        var $child;

        // set the maxLength for summaries
        if ($scope.maxLength === void 0) {
          $scope.maxLength = 250;
        }

        // toggle display of the rows details, a full list of the fields from each row
        $scope.toggleRow = function () {
          var row = $scope.row;
          var id = row._id;

          $scope.open = !$scope.open;

          var $tr = element;
          var $detailsTr = $tr.next();

          ///
          // add/remove $details children
          ///

          $detailsTr.toggle($scope.open);

          // Change the caret icon
          var $toggleIcon = $(element.children().first().find('i')[0]);
          $toggleIcon.toggleClass('fa-caret-down');
          $toggleIcon.toggleClass('fa-caret-right');

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

          var $childScope = _.assign($child, { row: row, showFilters: showFilters });
          $compile($detailsTr)($childScope);
        };

        $scope.filter = function (row, field, operation) {
          $scope.filtering(field, row._source[field] || row[field], operation);
        };

        $scope.$watchCollection('columns', function (columns) {
          element.empty();
          createSummaryRow($scope.row, $scope.row._id);
        });

        $scope.$watch('timefield', function (timefield) {
          element.empty();
          createSummaryRow($scope.row, $scope.row._id);
        });

        // create a tr element that lists the value for each *column*
        function createSummaryRow(row, id) {

          var expandTd = $('<td>').html('<i class="fa fa-caret-right"></span>')
            .attr('ng-click', 'toggleRow()');
          $compile(expandTd)($scope);
          element.append(expandTd);

          var td = $(document.createElement('td'));
          if ($scope.timefield) {
            td.addClass('discover-table-timefield');
            td.attr('width', '1%');
            _displayField(td, row, $scope.timefield);
            element.append(td);
          }

          _.each($scope.columns, function (column) {
            td = $(document.createElement('td'));
            _displayField(td, row, column);
            element.append(td);
          });
        }

        /**
         * Fill an element with the value of a field
         */
        function _displayField(el, row, field, truncate) {
          var val = _getValForField(row, field, truncate);
          el.text(val);
          return el;
        }

        /**
         * get the value of a field from a row, serialize it to a string
         * and truncate it if necessary
         *
         * @param  {object} row - the row to pull the value from
         * @param  {string} field - the name of the field (dot-seperated paths are accepted)
         * @param  {boolean} untruncate - Should truncated values have a "more" link to expand the text?
         * @return {[type]} a string, which should be inserted as text, or an element
         */
        function _getValForField(row, field, untruncate) {
          var val;

          // discover formats all of the values and puts them in _formatted for display
          val = row._formatted[field] || row[field];

          // undefined and null should just be an empty string
          val = (val == null) ? '' : val;

          // truncate the column text, not the details
          if (typeof val === 'string' && val.length > $scope.maxLength) {
            val = val.substring(0, $scope.maxLength) + '...';
          }

          return val;
        }

        init();
      }
    };

  });
});
