define(function (require) {
  var $ = require('jquery');
  var module = require('modules').get('kibana/directives');

  module.directive('kbnRows', function () {
    return {
      restrict: 'A',
      link: function ($scope, $el, attr) {
        $scope.$watch(attr.kbnRows, function (rows) {
          $el.empty();

          if (rows && rows.length) {
            rows.forEach(function (row) {
              var $tr = $(document.createElement('tr'));
              row.forEach(function (cell) {
                var $cell = $(document.createElement('td'));
                $cell.text(cell);
                $tr.append($cell);
              });
              $el.append($tr);
            });
          }
        });
      }
    };
  });
});