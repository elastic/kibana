define(function (require) {
  require('ui/modules')
  .get('kibana')
  .directive('nestingIndicator', function ($rootScope, $parse, Private) {
    const _ = require('lodash');
    const $ = require('jquery');
    const getColors = Private(require('ui/vislib/components/color/color_palette'));

    return {
      restrict: 'E',
      scope: {
        item: '=',
        list: '='
      },
      link: function ($scope, $el, attr) {
        $scope.$watchCollection('list', function () {
          if (!$scope.list || !$scope.item) return;

          const item = $scope.item;
          const index = $scope.list.indexOf($scope.item);
          const bars = $scope.list.slice(0, index + 1);
          const colors = getColors(bars.length);

          $el.html(bars.map(function (bar, i) {
            return $(document.createElement('span'))
            .css('background-color', colors[i]);
          }));
        });
      }
    };
  });
});
