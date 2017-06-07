import $ from 'jquery';
import _ from 'lodash';
import AggConfigResult from 'ui/vis/agg_config_result';
import { FilterBarClickHandlerProvider } from 'ui/filter_bar/filter_bar_click_handler';
import { uiModules } from 'ui/modules';
import tableCellFilterHtml from './partials/table_cell_filter.html';
const module = uiModules.get('kibana');

module.directive('kbnRows', function ($compile, $rootScope, getAppState, Private) {
  const filterBarClickHandler = Private(FilterBarClickHandlerProvider);
  return {
    restrict: 'A',
    link: function ($scope, $el, attr) {
      function addCell($tr, contents) {
        function createCell() {
          return $(document.createElement('td'));
        }

        function createFilterableCell(aggConfigResult) {
          const $template = $(tableCellFilterHtml);
          $template.addClass('cell-hover');

          const scope = $scope.$new();

          const $state = getAppState();
          const addFilter = filterBarClickHandler($state);
          scope.onFilterClick = (event, negate) => {
            // Don't add filter if a link was clicked.
            if ($(event.target).is('a')) {
              return;
            }

            addFilter({ point: { aggConfigResult: aggConfigResult }, negate });
          };

          return $compile($template)(scope);
        }

        let $cell;
        let $cellContent;

        //debugger;

        if (contents instanceof AggConfigResult) {
          const field = contents.aggConfig.getField(); //getField() is undefined in karma?
          const isCellContentFilterable =
            contents.aggConfig.isFilterable()
            && (!field || field.filterable);

          if (isCellContentFilterable) {
            $cell = createFilterableCell(contents);
            $cellContent = $cell.find('[data-cell-content]');
          } else {
            $cell = $cellContent = createCell();
          }

          // An AggConfigResult can "enrich" cell contents by applying a field formatter,
          // which we want to do if possible.
          contents = contents.toString('html');
        } else {
          $cell = $cellContent = createCell();

          // TODO: It would be better to actually check the type of the field, but we don't have
          // access to it here. This may become a problem with the switch to BigNumber
          if (_.isNumeric(contents)) {
            $cell.addClass('numeric-value');
          }
        }

        if (_.isObject(contents)) {
          if (contents.attr) {
            $cellContent.attr(contents.attr);
          }

          if (contents.class) {
            $cellContent.addClass(contents.class);
          }

          if (contents.scope) {
            $cellContent = $compile($cellContent.prepend(contents.markup))(contents.scope);
          } else {
            $cellContent.prepend(contents.markup);
          }

          if (contents.attr) {
            $cellContent.attr(contents.attr);
          }
        } else {
          if (contents === '') {
            $cellContent.prepend('&nbsp;');
          } else {
            $cellContent.prepend(contents);
          }
        }

        //Change request #9834 Color field format should apply to the whole cell in data table
        //At this point $cell has the background color applied by the color field formatter. I'm parsing it out and applying it to the whole cell.
        let backgroundColor;
        const fieldFormattedCell = $cell[0].querySelector('span > span');
        if (fieldFormattedCell) {
          const style = fieldFormattedCell.getAttribute('style');
          if (style) {
            const startIndex = style.indexOf('background-color: ');
            if (startIndex) {
              backgroundColor = style.substring(startIndex);
              $cell[0].setAttribute('style', backgroundColor);
            }
          }
        }

        $tr.append($cell);
      }

      function maxRowSize(max, row) {
        //debugger;
        //row is expected to be an Array with length. I'm incorrectly passing an AggConfigResult... was supposed to be recieving an Array containing two AggConfigResult objects!
        return Math.max(max, row.length);
      }

      $scope.$watchMulti([
        attr.kbnRows,
        attr.kbnRowsMin
      ], function (vals) {
        let rows = vals[0];
        const min = vals[1];
        //debugger;
        $el.empty();

        if (!_.isArray(rows)) rows = [];
        const width = rows.reduce(maxRowSize, 0);
        //debugger;

        if (isFinite(min) && rows.length < min) {
          // clone the rows so that we can add elements to it without upsetting the original
          rows = _.clone(rows);
          // crate the empty row which will be pushed into the row list over and over
          const emptyRow = new Array(width);
          // fill the empty row with values
          _.times(width, function (i) { emptyRow[i] = ''; });
          // push as many empty rows into the row array as needed
          _.times(min - rows.length, function () { rows.push(emptyRow); });
        }

        //debugger;
        rows.forEach(function (row) {
          const $tr = $(document.createElement('tr')).appendTo($el);
          row.forEach(function (cell) {
            addCell($tr, cell); //cell is an AggConfigResult
          });
        });
      });
    }
  };
});
