import uiModules from 'ui/modules';
import template from './view.html';
import './grok_pattern_definitions';

const app = uiModules.get('kibana');

//scope.processor, scope.pipeline are attached by the process_container.
app.directive('processorUiGrok', function () {
  return {
    restrict: 'E',
    template: template,
    controller : function ($scope) {
      const processor = $scope.processor;
      const pipeline = $scope.pipeline;

      function splitPatterns(delimitedList) {
        return delimitedList.split('\n');
      }

      function joinPatterns(valueArray) {
        return valueArray.join('\n');
      }

      function updatePatterns() {
        processor.patterns = splitPatterns($scope.patterns);
      }

      $scope.patterns = joinPatterns(processor.patterns);

      $scope.$watch('processor.sourceField', () => { pipeline.setDirty(); });
      $scope.$watch('patterns', updatePatterns);
      $scope.$watchCollection('processor.patterns', () => { pipeline.setDirty(); });
      $scope.$watch('processor.traceMatch', () => { pipeline.setDirty(); });
      $scope.$watchCollection('processor.patternDefinitions', () => { pipeline.setDirty(); }, true);
      $scope.$watch('processor.ignoreMissing', () => { pipeline.setDirty(); });
    }
  };
});
