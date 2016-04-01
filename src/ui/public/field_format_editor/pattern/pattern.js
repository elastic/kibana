define(function (require) {
  require('ui/field_format_editor/samples/samples');

  require('ui/modules')
  .get('kibana')
  .directive('fieldFormatEditorPattern', function () {
    return {
      restrict: 'E',
      template: require('ui/field_format_editor/pattern/pattern.html'),
      require: ['ngModel', '^fieldEditor'],
      scope: true,
      link: function ($scope, $el, attrs, cntrls) {
        let ngModelCntrl = cntrls[0];

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
});
