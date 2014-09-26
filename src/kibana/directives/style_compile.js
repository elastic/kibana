define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');

  require('modules')
  .get('kibana')
  .directive('styleCompile', function ($compile, config) {
    return {
      restrict: 'E',
      link: function ($scope, $el) {

        var truncateGradientHeight = 15;

        // watch the value of the truncate:maxHeight config param
        $scope.$watch(function () {
          return config.get('truncate:maxHeight');
        }, function (maxHeight) {
          if (maxHeight > 0) {
            $scope.truncateMaxHeight = maxHeight + 'px !important';
            $scope.truncateGradientTop = maxHeight - truncateGradientHeight + 'px';
          } else {
            $scope.truncateMaxHeight = 'none';
            $scope.truncateGradientTop = '-' + truncateGradientHeight + 'px';
          }
        });

        var $style = $('<style>');
        $el.after($style);

        $scope.$watch(function () { return $el.html(); }, function (stagedCss) {
          $style.html(stagedCss);
        });
      }
    };
  });
});