define(function (require) {
  var html = require('text!partials/table.html');
  var _ = require('lodash');
  var nextTick = require('utils/next_tick');
  var $ = require('jquery');
  var jsonpath = require('jsonpath');

  require('directives/truncated');
  require('directives/infinite_scroll');

  var module = require('modules').get('kibana/directives');

  module.directive('kbnTableHeader', function () {
    var headerHtml = require('text!partials/table_header.html');
    return {
      restrict: 'E',
      scope: {
        columns: '=',
        getSort: '=',
        setSort: '='
      },
      template: headerHtml,
      controller: function ($scope) {

        $scope.headerClass = function (column) {
          //var sort = [0,0];
          var sort = $scope.getSort();
          if (column === sort[0]) {
            return ['fa', sort[1] === 'asc' ? 'fa-chevron-up' : 'fa-chevron-down'];
          } else {
            return ['fa', ''];
          }
        };

        $scope.set = function (column) {
          var sort = $scope.getSort();
          console.log('dir', sort);
          $scope.setSort(column, sort[1] === 'asc' ? 'desc' : 'asc');
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
  module.directive('kbnTable', function ($compile) {
    // base class for all dom nodes
    var DOMNode = window.Node;

    function scheduleNextRenderTick(cb) {
      if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(cb);
      } else {
        nextTick(cb);
      }
    }

    return {
      restrict: 'E',
      template: html,
      scope: {
        columns: '=',
        rows: '=',
        refresh: '=',
        getSort: '=',
        setSort: '=',
        maxLength: '=?'
      },
      link: function ($scope, element, attrs) {
        // track a list of id's that are currently open, so that
        // render can easily render in the same current state
        var opened = [];

        // the current position in the list of rows
        var cursor = 0;

        // the page size to load rows (out of the rows array, load 50 at a time)
        var pageSize = 50;

        // rendering an entire page while the page is scrolling can cause a good
        // bit of jank, lets only render a certain amount per "tick"
        var rowsPerTick;

        // set the maxLength for summaries
        if ($scope.maxLength === void 0) {
          $scope.maxLength = 250;
        }

        // rerender when either is changed
        $scope.$watch('rows', render);
        $scope.$watch('columns', render);
        $scope.$watch('maxLength', render);

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

        var renderRows = (function () {
          // basic buffer that will be pulled from when we are adding rows.
          var queue = [];
          var rendering = false;

          return function renderRows(rows) {
            // overwrite the queue, don't keep old rows
            queue = rows.slice(0);
            if (!rendering) {
              onTick();
            }
          };

          function forEachRow(row, i, currentChunk) {
            var id = rowId(row);
            var $summary = createSummaryRow(row, id);
            var $details = createDetailsRow(row, id);
            // cursor is the end of current selection, so
            // subtract the remaining queue size, then the
            // size of this chunk, and add the current i
            var currentPosition = cursor - queue.length - currentChunk.length + i;
            if (currentPosition % 2) {
              $summary.addClass('even');
              $details.addClass('even');
            }

            $body.append([
              $summary,
              $details
            ]);
          }

          function onTick() {
            // ensure that the rendering flag is set
            rendering = true;
            var performance = window.performance;
            var timing;

            if (
              rowsPerTick === void 0
              && typeof window.performance === 'object'
              && typeof performance.now === 'function'
            ) {
              timing = performance.now();
              rowsPerTick = 30;
            }

            queue
              // grab the first n from the buffer
              .splice(0, rowsPerTick)
              // render each row
              .forEach(forEachRow);

            if (timing) {
              // we know we have performance.now, because timing was set
              var time = performance.now() - timing;
              var rowsRendered = rowsPerTick;
              var msPerRow = time / rowsPerTick;
              // aim to fit the rendering into 5 milliseconds
              rowsPerTick = Math.ceil(15 / msPerRow);
              console.log('completed render of %d rows in %d milliseconds. rowsPerTick set to %d', rowsRendered, time, rowsPerTick);
            }

            if (queue.length) {
              // the queue is not empty, draw again next tick
              scheduleNextRenderTick(onTick);
            } else {
              // unset the rendering flag
              rendering = false;
            }
          }
        }());

        function addRows() {
          if (cursor > $scope.rows.length) {
            $scope.addRows = null;
          }
          renderRows($scope.rows.slice(cursor, cursor += pageSize));
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

          // rather than replace the entire row, just replace the
          // children, this way we keep the "even" class on the row
          appendDetailsToRow(
            $(event.delegateTarget).next().empty(),
            row,
            id
          );
        };

        var topLevelDetails = '_index _type _id'.split(' ');
        function createDetailsRow(row, id) {
          var $tr = $(document.createElement('tr'));
          return appendDetailsToRow($tr, row, id);
        }

        function appendDetailsToRow($tr, row, id) {
          // we need a td to wrap the details table
          var containerTd = document.createElement('td');
          containerTd.setAttribute('colspan', $scope.columns.length);
          $tr.append(containerTd);

          var open = !!~opened.indexOf(id);
          $tr.toggle(open);

          // it's closed, so no need to go any further
          if (!open) return $tr;

          // table that will hold details about the row
          var table = document.createElement('table');
          containerTd.appendChild(table);
          table.className = 'table';

          // body of the table
          var tbody = document.createElement('tbody');
          table.appendChild(tbody);

          // itterate each row and append it to the tbody
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
              _displayField(valTd, row, field, true);
              tr.appendChild(valTd);

              tbody.appendChild(tr);
            });

          return $tr;
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
        function _displayField(el, row, field, truncate) {
          var val = _getValForField(row, field, truncate);
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
         * @param  {string} field - the name of the field (dot-seperated paths are accepted)
         * @param  {boolean} untruncate - Should truncated values have a "more" link to expand the text?
         * @return {[type]} a string, which should be inserted as text, or an element
         */
        function _getValForField(row, field, untruncate) {
          var val;

          // Fall back to the root if not found in _source
          val = jsonPath.eval(row, '$._source.' + field)[0] || row[field];

          // undefined and null should just be an empty string
          val = (val == null) ? '' : val;

          // stringify array's and objects
          if (typeof val === 'object') val = JSON.stringify(val);

          // truncate
          if (typeof val === 'string' && val.length > $scope.maxLength) {
            if (untruncate) {
              var complete = val;
              val = document.createElement('kbn-truncated');
              val.setAttribute('orig', complete);
              val.setAttribute('length', $scope.maxLength);
              val = $compile(val)($scope)[0];// return the actual element
            } else {
              val = val.substring(0, $scope.maxLength) + '...';
            }
          }

          return val;
        }
      }
    };
  });
});