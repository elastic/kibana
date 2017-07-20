import { uiModules } from 'ui/modules';

uiModules
  .get('kibana')
  .directive('validateAgg', function () {
    return {
      restrict: 'A',
      require: 'ngModel',
      scope: {
        'ngModel': '=',
        'agg': '='
      },
      link: function ($scope, elem, attr, ngModel) {
        function validateAgg(aggValue) {
          if (aggValue == null || aggValue === 'custom') {
            ngModel.$setValidity('aggInput', true);
            return aggValue;
          }

          try {
            $scope.agg.params.customMetric = null;
            $scope.agg.params.metricAgg = aggValue;
            $scope.agg.makeLabel();
            ngModel.$setValidity('aggInput', true);
          } catch (e) {
            ngModel.$setValidity('aggInput', false);
          }

          return aggValue;
        }

        // From User
        ngModel.$parsers.unshift(validateAgg);

        // To user
        ngModel.$formatters.unshift(validateAgg);
      }
    };
  });
