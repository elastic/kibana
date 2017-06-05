import _ from 'lodash';
import { uiModules } from 'ui/modules';

uiModules
.get('app/visualize')
.directive('visAggParamEditor', function (config) {
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
      post: function ($scope) {
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
