define(function (require) {
  var $ = require('jquery');
  var _ = require('lodash');
  var module = require('modules').get('kibana');

  module.directive('kbnRows', function ($parse) {
    return {
      restrict: 'A',
      link: function ($scope, $el, attr) {
        var getter = $parse(attr.kbnRowsMin);

        $scope.$watch(attr.kbnRows, function (rows) {
          $el.empty();

          var min = getter($scope);
          var width = _.reduce(rows, function (memo, row) {
            return Math.max(memo, row.length);
          }, 0);

          if (!_.isArray(rows)) rows = [];
          if (min && rows.length < min) {
            // clone the rows so that we can add elements to it without upsetting the original
            rows = _.clone(rows);
            // crate the empty row which will be pushed into the row list over and over
            var emptyRow = new Array(width);
            // fill the empty row with values
            _.times(width, function (i) { emptyRow[i] = ''; });
            // push as many empty rows into the row array as needed
            _.times(min - rows.length, function () { rows.push(emptyRow); });
          }

          var addCell = function ($tr, contents) {
            var $cell = $(document.createElement('td'));

            // TODO: It would be better to actually check the type of the field, but we don't have
            // access to it here. This may become a problem with the switch to BigNumber
            if (_.isNumeric(contents)) $cell.addClass('numeric-value');

            if (contents === '') {
              $cell.html('&nbsp;');
            } else {
              $cell.text(contents);
            }
            $tr.append($cell);
          };

          rows.forEach(function (row) {
            var $tr = $(document.createElement('tr'));
            $el.append($tr);

            for (var i = 0; i < width; i++) {
              addCell($tr, row[i]);
            }
          });
        });
      }
    };
  });
});