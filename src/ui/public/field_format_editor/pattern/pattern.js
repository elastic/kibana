import '../samples/samples';
import { uiModules } from '../../modules';
import patternTemplate from './pattern.html';

uiModules
  .get('kibana')
  .directive('fieldFormatEditorPattern', function () {
    return {
      restrict: 'E',
      replace: true,
      template: patternTemplate,
      require: ['ngModel', '^fieldEditor'],
      scope: true,
      link: function ($scope, $el, attrs, cntrls) {
        const ngModelCntrl = cntrls[0];

        $scope.$bind('inputs', attrs.inputs);
        $scope.$bind('placeholder', attrs.placeholder);
        attrs.$observe('id', () => $scope.id = attrs.id);

        // bind our local model with the outside ngModel
        $scope.$watch('model', v => ngModelCntrl.$setViewValue(v));
        ngModelCntrl.$render = function () {
          $scope.model = ngModelCntrl.$viewValue;
        };
      }
    };
  });
