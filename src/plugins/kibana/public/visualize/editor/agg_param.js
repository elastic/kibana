define(function (require) {
  const _ = require('lodash');

  require('ui/modules')
  .get('app/visualize')
  .directive('visAggParamEditor', function (config, $parse, Private) {
    return {
      restrict: 'E',
      scope: true,
      template: function ($el) {
        return $el.html();
      },
      link: {
        pre: function ($scope, $el, attr) {
          $scope.$bind('aggParam', attr.aggParam);
        },
        post: function ($scope, $el, attr) {
          $scope.config = config;

          $scope.optionEnabled = function (option) {
            if (option && _.isFunction(option.enabled)) {
              return option.enabled($scope.agg);
            }

            return true;
          };
        }
      }
    };
  });
});
