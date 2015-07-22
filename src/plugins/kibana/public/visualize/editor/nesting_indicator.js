define(function (require) {
  require('ui/modules')
  .get('kibana')
  .directive('nestingIndicator', function ($rootScope, $parse, Private) {
    var _ = require('lodash');
    var $ = require('jquery');
    var getColors = Private(require('ui/vislib/components/color/color_palette'));

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
          var index = $scope.list.indexOf($scope.item);
          var bars = $scope.list.slice(0, index + 1);
          var colors = getColors(bars.length);

          $el.html(bars.map(function (item, i) {
            return $(document.createElement('span'))
            .css('background-color', colors[i]);
          }));
        });
      }
    };
  });
});