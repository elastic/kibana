define(function (require) {
  var _ = require('lodash');

  require('modules')
  .get('app/visualize')
  .directive('visAggParamEditor', function (config) {
    return {
      restrict: 'E',
      scope: {
        aggType: '=',
        aggConfig: '=',
        aggParam: '=',
        params: '='
      },
      template: function ($el, attr) {
        return $el.html();
      },
      link: function ($scope) {
        $scope.config = config;
        $scope.optionEnabled = function (option) {
          if (option && _.isFunction(option.enabled)) {
            return option.enabled($scope.aggConfig);
          }

          return true;
        };
      }
    };
  });
});