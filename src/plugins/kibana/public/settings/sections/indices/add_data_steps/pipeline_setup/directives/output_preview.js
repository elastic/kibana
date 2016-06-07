import uiModules from 'ui/modules';
import jsondiffpatch from '@bigfunger/jsondiffpatch';
import '../styles/_output_preview.less';
import outputPreviewTemplate from '../views/output_preview.html';

const htmlFormat = jsondiffpatch.formatters.html.format;
const app = uiModules.get('kibana');

app.directive('outputPreview', function () {
  return {
    restrict: 'E',
    template: outputPreviewTemplate,
    scope: {
      processor: '='
    },
    link: function ($scope, $el) {
      const div = $el.find('.visual')[0];
      const processor = $scope.processor;

      $scope.diffpatch = jsondiffpatch.create({
        arrays: {
          detectMove: false
        },
        textDiff: {
          minLength: 120
        }
      });

      $scope.updateUi = function () {
        let delta = $scope.diffpatch.diff(processor.inputObject, processor.outputObject);
        if (!delta || processor.error || processor.new) delta = {};

        div.innerHTML = htmlFormat(delta, processor.inputObject);
      };
    },
    controller: function ($scope, debounce) {
      $scope.collapsed = false;

      const updateOutput = debounce(function () {
        $scope.updateUi();
      }, 200);

      $scope.$watch('processor.outputObject', updateOutput);
      $scope.$watch('processor.inputObject', updateOutput);
    }
  };
});
