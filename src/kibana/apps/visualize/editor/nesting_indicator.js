define(function (require) {
  require('modules')
  .get('kibana')
  .directive('nestingIndicator', function ($rootScope, $parse, Private) {
    var _ = require('lodash');
    var angular = require('angular');
    var ruleBase = 'border-left-';

    var getColor = (function () {
      var i = 0;
      var colorPool = Private(require('components/vislib/components/_functions/color/color_palette'))(100);
      var assigned = {};
      return function (item) {
        var key = item.$$hashKey;
        if (!key) throw new Error('expected an item that is part of an ngRepeat');

        if (!assigned[key]) {
          assigned[key] = colorPool[i++ % colorPool.length];
        }

        return assigned[key];
      };
    }());

    var allIndicators = [];
    allIndicators.expanded = false;
    allIndicators.expand = toggler(true);
    allIndicators.contract = toggler(false, 150);

    function toggler(on, delay) {
      var all = allIndicators;
      var work = function () {
        if (delay && all.expanded !== on) return;
        all.forEach(function ($scope) {
          if (!$scope.bars) return;
          $scope.bars.forEach(function ($el) {
            $el.toggleClass('expand', on);
          });
        });
      };
      return function () {
        all.expanded = on;
        if (!delay) work();
        else setTimeout(work, delay);
      };
    }

    return {
      restrict: 'E',
      scope: {
        item: '=',
        list: '='
      },
      link: function ($scope, $el, attr) {

        allIndicators.push($scope);
        $el.on('mouseenter', allIndicators.expand);
        $el.on('mouseleave', allIndicators.contract);

        $scope.$on('$destroy', function () {
          _.pull(allIndicators, $scope);
          $el.off('mouseenter', allIndicators.expand);
          $el.off('mouseleave', allIndicators.contract);
        });

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