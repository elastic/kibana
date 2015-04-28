define(function (require) {
  var _ = require('lodash');

  require('modules')
  .get('kibana')
  .directive('fieldEditorPattern', function ($sce, Promise) {
    return {
      restrict: 'E',
      template: require('text!components/field_editor/pattern/pattern.html'),
      require: ['ngModel', '^fieldEditor'],
      scope: true,
      link: function ($scope, $el, attrs, cntrls) {
        var ngModelCntrl = cntrls[0];
        var editor = cntrls[1];

        $scope.samples = null;
        $scope.$bind('inputs', attrs.samples);
        $scope.$bind('placeholder', attrs.placeholder);

        $scope.$watch('model', ngModelCntrl.$setViewValue);
        ngModelCntrl.$render = function () {
          $scope.model = ngModelCntrl.$viewValue;
        };

        $scope.$watchMulti([
          '=editor.field.format._params',
          '[]inputs',
          'model'
        ], function () {
          $scope.samples = null;
          var field = editor.field;

          if (!field || !field.format) {
            return;
          }

          Promise.try(function () {
            var converter = field.format.getConverterFor('html');
            $scope.samples = _.map($scope.inputs, function (input) {
              return [input, $sce.trustAsHtml(converter(input))];
            });
          })
          .then(validity, validity);
        });

        function validity(err) {
          $scope.error = err;
          ngModelCntrl.$setValidity('patternExecutes', !err);
        }
      }
    };
  });
});
