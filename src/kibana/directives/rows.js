define(function (require) {
  var $ = require('jquery');
  var _ = require('lodash');
  var module = require('modules').get('kibana');
  var AggConfigResult = require('components/vis/_agg_config_result');

  module.directive('kbnRows', function ($compile, $rootScope, getAppState, Private) {
    var filterBarClickHandler = Private(require('components/filter_bar/filter_bar_click_handler'));
    return {
      restrict: 'A',
      link: function ($scope, $el, attr) {
        function addCell($tr, contents) {
          var $cell = $(document.createElement('td'));

          // TODO: It would be better to actually check the type of the field, but we don't have
          // access to it here. This may become a problem with the switch to BigNumber
          if (_.isNumeric(contents)) $cell.addClass('numeric-value');

          var createAggConfigResultCell = function (aggConfigResult) {
            var $cell = $(document.createElement('td'));
            var $state = getAppState();
            var clickHandler = filterBarClickHandler($state);
            $cell.scope = $scope.$new();
            $cell.addClass('cell-hover');
            $cell.attr('ng-click', 'clickHandler()');
            $cell.scope.clickHandler = function () {
              clickHandler({ point: { aggConfigResult: aggConfigResult } });
            };
            return $compile($cell)($cell.scope);
          };

          if (contents instanceof AggConfigResult) {
            if (contents.type === 'bucket' && contents.aggConfig.field() && contents.aggConfig.field().filterable) {
              $cell = createAggConfigResultCell(contents);
            }
            contents = contents.toString('html');
          }

          if (_.isObject(contents)) {
            if (contents.attr) {
              $cell.attr(contents.attr);
            }

            if (contents.class) {
              $cell.addClass(contents.class);
            }

            if (contents.scope) {
              $cell = $compile($cell.html(contents.markup))(contents.scope);
            } else {
              $cell.html(contents.markup);
            }
          } else {
            if (contents === '') {
              $cell.html('&nbsp;');
            } else {
              $cell.html(contents);
            }
          }

          $tr.append($cell);
        }

        function maxRowSize(max, row) {
          return Math.max(max, row.length);
        }

        $scope.$watchMulti([
          attr.kbnRows,
          attr.kbnRowsMin
        ], function (vals) {
          var rows = vals[0];
          var min = vals[1];

          $el.empty();

          if (!_.isArray(rows)) rows = [];
          var width = rows.reduce(maxRowSize, 0);

          if (isFinite(min) && rows.length < min) {
            // clone the rows so that we can add elements to it without upsetting the original
            rows = _.clone(rows);
            // crate the empty row which will be pushed into the row list over and over
            var emptyRow = new Array(width);
            // fill the empty row with values
            _.times(width, function (i) { emptyRow[i] = ''; });
            // push as many empty rows into the row array as needed
            _.times(min - rows.length, function () { rows.push(emptyRow); });
          }

          rows.forEach(function (row) {
            var $tr = $(document.createElement('tr')).appendTo($el);
            row.forEach(function (cell) {
              addCell($tr, cell);
            });
          });
        });
      }
    };
  });
});
