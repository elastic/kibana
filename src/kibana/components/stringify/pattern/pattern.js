define(function (require) {
  var _ = require('lodash');

  require('modules')
  .get('kibana')
  .directive('fieldEditorPattern', function ($sce) {
    return {
      restrict: 'E',
      template: require('text!components/stringify/pattern/pattern.html'),
      require: ['ngModel', '^fieldEditor'],
      scope: true,
      link: function ($scope, $el, attrs, cntrls) {
        var ngModelCntrl = cntrls[0];
        var editor = cntrls[1];

        $scope.samples = null;
        $scope.$bind('inputs', attrs.samples);

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

          var converter = field.format.getConverterFor('html');
          $scope.samples = _.map($scope.inputs, function (input) {
            return [input, $sce.trustAsHtml(converter(input))];
          });
        });
      }
    };
  });
});
