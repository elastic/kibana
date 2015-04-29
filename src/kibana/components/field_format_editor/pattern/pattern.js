define(function (require) {
  require('components/field_format_editor/samples/samples');

  require('modules')
  .get('kibana')
  .directive('fieldFormatEditorPattern', function () {
    return {
      restrict: 'E',
      template: require('text!components/field_format_editor/pattern/pattern.html'),
      require: ['ngModel', '^fieldEditor'],
      scope: true,
      link: function ($scope, $el, attrs, cntrls) {
        var ngModelCntrl = cntrls[0];

        $scope.$bind('inputs', attrs.samples);
        $scope.$bind('placeholder', attrs.placeholder);

        // bind our local model with the outside ngModel
        $scope.$watch('model', ngModelCntrl.$setViewValue);
        ngModelCntrl.$render = function () {
          $scope.model = ngModelCntrl.$viewValue;
        };
      }
    };
  });
});
