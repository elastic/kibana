define(function (require) {
  require('modules')
  .get('kibana')
  .directive('nestingIndicator', function ($rootScope, $parse, Private) {
    var _ = require('lodash');
    var angular = require('angular');
    var ruleBase = 'border-left-';

    var getColor = (function () {
      var i = 0;
      var colorPool = Private(require('components/vislib/components/color/color_palette'))(100);
      var assigned = {};
      return function (item) {
        var key = item.id || item.$$hashKey;
        if (!key) throw new Error('expected an item that is part of an ngRepeat');

        if (!assigned[key]) {
          assigned[key] = colorPool[i++ % colorPool.length];
        }

        return assigned[key];
      };
    }());

    return {
      restrict: 'E',
      scope: {
        item: '=',
        list: '='
      },
      link: function ($scope, $el, attr) {

        $scope.$watchCollection('list', function () {
          if (!$scope.list || !$scope.item) return;

          var item = $scope.item;
          var list = $scope.list;
          var bars = $scope.bars = [];

          for (var i = 0; i <= list.length; i++) {
            var color = getColor(list[i]);

            bars.push(
              angular
                .element('<span>')
                .css('background-color', color)
            );

            if (list[i] === $scope.item) break;
          }

          $el.html(bars);
        });
      }
    };
  });
});