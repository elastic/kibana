define(function (require) {
  var _ = require('lodash');

  require('modules').get('kibana')
  .directive('kbnValidOptions', function ($parse) {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function ($scope, $el, attr, ngModel) {
        var getOptions = $parse(attr.kbnValidOptions);

        $scope.ngModel = ngModel;
        var options;

        $scope.$watchCollection(function () { return options = getOptions($scope); }, valid);
        $scope.$watch('ngModel.$modelValue', valid);

        function valid() {
          if (!_.contains(options, ngModel.$modelValue)) {
            ngModel.$setViewValue(undefined);
            ngModel.$render();
          }
        }
      }
    };
  });
});