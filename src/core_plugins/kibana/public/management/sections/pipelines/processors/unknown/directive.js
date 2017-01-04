import { isObject } from 'lodash';
import uiModules from 'ui/modules';
import template from './view.html';

const app = uiModules.get('kibana');

//scope.pipeline, scope.processor are attached by the process_container.
app.directive('processorUiUnknown', function () {
  return {
    restrict: 'E',
    template: template,
    controller : function ($scope) {
      const processor = $scope.processor;
      const pipeline = $scope.pipeline;

      $scope.formattedJson = JSON.stringify(processor.json);

      function updateJson() {
        try {
          const json = JSON.parse($scope.formattedJson);
          if (isObject(json)) {
            processor.json = json;
          } else {
            processor.json = {};
          }
        }
        catch (error) {
          processor.json = {};
        }
      }

      $scope.$watch('formattedJson', updateJson);
      $scope.$watch('processor.json', () => { pipeline.setDirty(); });
    }
  };
});
