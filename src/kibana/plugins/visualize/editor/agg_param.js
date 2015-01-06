define(function (require) {
  var _ = require('lodash');

  require('modules')
  .get('app/visualize')
  .directive('visAggParamEditor', function (config, $parse, Private) {
    var FieldAggParam = Private(require('components/agg_types/param_types/field'));

    return {
      restrict: 'E',
      scope: true,
      template: function ($el) {
        return $el.html();
      },
      link: function ($scope, $el, attr) {
        $scope.aggParam = $parse(attr.aggParam)($scope);
        $scope.config = config;
        $scope.optionEnabled = function (option) {
          if (option && _.isFunction(option.enabled)) {
            return option.enabled($scope.agg);
          }

          return true;
        };

        // set default value on field agg params
        if ($scope.aggParam instanceof FieldAggParam) {
          if (!$scope.agg.params[$scope.aggParam.name]) {
            $scope.agg.params[$scope.aggParam.name] = $scope.indexedFields[0];
          }
        }
      }
    };
  });
});