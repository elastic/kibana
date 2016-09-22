import { get } from 'lodash';
import uiModules from 'ui/modules';
import jsondiffpatch from '@bigfunger/jsondiffpatch';
import '../styles/_processor_output.less';
import template from '../views/processor_output.html';

const htmlFormat = jsondiffpatch.formatters.html.format;
const app = uiModules.get('kibana');

app.directive('processorOutput', function (debounce) {
  return {
    restrict: 'E',
    template: template,
    scope: {
      processor: '='
    },
    link: function ($scope, $el) {
      const div = $el.find('.visual')[0];
      const processor = $scope.processor;

      const diffpatch = jsondiffpatch.create({
        arrays: {
          detectMove: false
        },
        textDiff: {
          minLength: 120
        }
      });

      $scope.collapsed = false;

      const updateOutput = debounce(() => {
        const showMeta = processor.outputControlsState.showMeta;
        const oldValue = get(processor.inputObject, showMeta ? 'meta' : 'doc');
        const newValue = get(processor.outputObject, showMeta ? 'meta' : 'doc');

        let delta = diffpatch.diff(oldValue, newValue);
        if (!delta || processor.error || processor.new) delta = {};

        div.innerHTML = htmlFormat(delta, oldValue);
      }, 200);

      $scope.$watch('processor.outputObject', updateOutput);
      $scope.$watch('processor.inputObject', updateOutput);
      $scope.$watch('processor.outputControlsState.showMeta', updateOutput);
    }
  };
});
