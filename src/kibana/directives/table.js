define(function (require) {
  var html = require('text!partials/table.html');
  var angular = require('angular');
  var _ = require('lodash');

  require('directives/truncated');
  require('directives/infinite_scroll');

  var module = angular.module('kibana/directives');

  /**
   * kbnTable directive
   *
   * displays results in a simple table view. Pass the result object
   * via the results attribute on the kbnTable element:
   * ```
   * <kbn-table columns="columnsToDisplay" rows="rowsToDisplay"></kbn-table>
   * ```
   */
  module.directive('kbnTable', function ($compile) {
    // base class for all dom nodes
    var DOMNode = window.Node;

    return {
      restrict: 'E',
      template: html,
      scope: {
        columns: '=',
        rows: '='
      },
      link: function ($scope, element, attrs) {
        // track a list of id's that are currently open, so that
        // render can easily render in the same current state
        var opened = [];

        // the current position in the list of rows
        var cursor = 0;

        // the page size to load rows (out of the rows array, load 50 at a time)
        var pageSize = 50;

        // rerender when either is changed
        $scope.$watch('rows', render);
        $scope.$watch('columns', render);

        // the body of the table
        var $body = element.find('tbody');

        // itterate the columns and rows, rebuild the table's html
        function render() {
          $body.empty();
          if (!$scope.rows || $scope.rows.length === 0) return;
          if (!$scope.columns || $scope.columns.length === 0) return;
          cursor = 0;
          addRows();
          $scope.addRows = addRows;
        }

        function addRows() {
          if (cursor > $scope.rows.length) {
            $scope.addRows = null;
          }

          $scope.rows.slice(cursor, cursor += pageSize).forEach(function (row, i) {
            var id = rowId(row);
            var $summary = createSummaryRow(row, id);
            if (i % 2) $summary.addClass('even');

            $body.append([
              $summary,
              createDetailsRow(row, id)
            ]);
          });
        }

        // for now, rows are "tracked" by their index, but this could eventually
        // be configured so that changing the order of the rows won't prevent
        // them from staying open on update
        function rowId(row) {
          var id = $scope.rows.indexOf(row);
          return ~id ? id : null;
        }

        // inverse of rowId()
        function rowForId(id) {
          return $scope.rows[id];
        }

        // toggle display of the rows details, a full list of the fields from each row
        $scope.toggleRow = function (id, event) {
          var row = rowForId(id);

          if (~opened.indexOf(id)) {
            _.pull(opened, id);
          } else {
            opened.push(id);
          }

          angular
            .element(event.delegateTarget)
            .next()
            .replaceWith(createDetailsRow(row, id));
        };

        var topLevelDetails = '_index _type _id'.split(' ');
        function createDetailsRow(row, id) {
          var tr = document.createElement('tr');

          var containerTd = document.createElement('td');
          containerTd.setAttribute('colspan', $scope.columns.length);
          tr.appendChild(containerTd);

          if (!~opened.indexOf(id)) {
            // short circuit if the row is hidden
            tr.style.display = 'none';
            return tr;
          }

          var table = document.createElement('table');
          containerTd.appendChild(table);
          table.className = 'table';

          var tbody = document.createElement('tbody');
          table.appendChild(tbody);

          _(row._source)
            .keys()
            .concat(topLevelDetails)
            .sort()
            .each(function (field) {
              var tr = document.createElement('tr');
              // tr -> || <field> || <val> ||

              var fieldTd = document.createElement('td');
              fieldTd.textContent = field;
              fieldTd.className = 'field-name';
              tr.appendChild(fieldTd);

              var valTd = document.createElement('td');
              _displayField(valTd, row, field);
              tr.appendChild(valTd);

              tbody.appendChild(tr);
            });

          return tr;
        }

        // create a tr element that lists the value for each *column*
        function createSummaryRow(row, id) {
          var tr = document.createElement('tr');
          tr.setAttribute('ng-click', 'toggleRow(' + JSON.stringify(id) + ', $event)');
          var $tr = $compile(tr)($scope);

          _.each($scope.columns, function (column) {
            var td = document.createElement('td');
            _displayField(td, row, column);
            $tr.append(td);
          });

          return $tr;
        }

        /**
         * Fill an element with the value of a field
         */
        function _displayField(el, row, field) {
          var val = _getValForField(row, field);
          if (val instanceof DOMNode) {
            el.appendChild(val);
          } else {
            el.textContent = val;
          }
          return el;
        }

        /**
         * get the value of a field from a row, serialize it to a string
         * and truncate it if necessary
         *
         * @param  {object} row - the row to pull the value from
         * @param  {[type]} field - the name of the field (dot-seperated paths are accepted)
         * @return {[type]} a string, which should be inserted as text, or an element
         */
        function _getValForField(row, field) {
          var val;

          // is field name a path?
          if (~field.indexOf('.')) {
            var path = field.split('.');
            // only check source for "paths"
            var current = row._source;
            var step;
            while (step = path.shift() && current) {
              // walk from the _source to the specified by the path
              current = current[step];
            }
            val = current;
          } else {
            // simple, with a fallback to row
            val = row._source[field] || row[field];
          }

          // undefined and null should just be an empty string
          val = (val == null) ? '' : val;

          // stringify array's and objects
          if (typeof val === 'object') val = JSON.stringify(val);

          // truncate
          if (typeof val === 'string' && val.length > 150) {
            var complete = val;
            val = document.createElement('kbn-truncated');
            val.setAttribute('orig', complete);
            val.setAttribute('length', 150);
            val = $compile(val)($scope)[0];// return the actual element
          }

          return val;
        }
      }
    };
  });
});