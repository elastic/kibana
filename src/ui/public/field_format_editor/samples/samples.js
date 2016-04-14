define(function (require) {
  let _ = require('lodash');

  require('ui/modules')
  .get('kibana')
  .directive('fieldFormatEditorSamples', function ($sce, Promise) {
    return {
      restrict: 'E',
      template: require('ui/field_format_editor/samples/samples.html'),
      require: ['?^ngModel', '^fieldEditor'],
      scope: true,
      link: function ($scope, $el, attrs, cntrls) {
        let ngModelCntrl = cntrls[0];

        $scope.samples = null;
        $scope.$bind('inputs', attrs.inputs);

        $scope.$watchMulti([
          'editor.field.format',
          '[]inputs'
        ], function () {
          $scope.samples = null;
          let field = $scope.editor.field;

          if (!field || !field.format) {
            return;
          }

          Promise.try(function () {
            let converter = field.format.getConverterFor('html');
            $scope.samples = _.map($scope.inputs, function (input) {
              return [input, $sce.trustAsHtml(converter(input))];
            });
          })
          .then(validity, validity);
        });

        function validity(err) {
          $scope.error = err;
          ngModelCntrl && ngModelCntrl.$setValidity('patternExecutes', !err);
        }
      }
    };
  });
});
