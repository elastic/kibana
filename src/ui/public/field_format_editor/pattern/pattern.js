import 'ui/field_format_editor/samples/samples';
import uiModules from 'ui/modules';
import patternTemplate from 'ui/field_format_editor/pattern/pattern.html';

uiModules
.get('kibana')
.directive('fieldFormatEditorPattern', function () {
  return {
    restrict: 'E',
    template: patternTemplate,
    require: ['ngModel', '^fieldEditor'],
    scope: true,
    link: function ($scope, $el, attrs, cntrls) {
      const ngModelCntrl = cntrls[0];

      $scope.$bind('inputs', attrs.inputs);
      $scope.$bind('placeholder', attrs.placeholder);

      // bind our local model with the outside ngModel
      $scope.$watch('model', ngModelCntrl.$setViewValue);
      ngModelCntrl.$render = function () {
        $scope.model = ngModelCntrl.$viewValue;
      };
    }
  };
});
