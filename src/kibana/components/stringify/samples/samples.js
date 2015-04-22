define(function (require) {
  var _ = require('lodash');

  require('modules')
  .get('kibana')
  .directive('fieldEditorSamples', function () {
    return {
      restrict: 'A',
      template: require('text!components/stringify/samples/samples.html'),
      scope: true,
      link: function ($scope, $el, attrs) {
        $scope.$bind('format', 'editor.field.format');
        $scope.$bind('params', 'editor.formatParams');
        $scope.$bind('inputs', attrs.fieldEditorSamples);

        $scope.samples = null;

        $scope.$watchMulti([
          '=format._params',
          '[]inputs',
        ], function (pattern) {
          if (!pattern) {
            $scope.samples = null;
            return;
          }

          $scope.samples = _.map($scope.inputs, function (input) {
            return [input, $scope.format.convert(input)];
          });
        });
      }
    };
  });
});
