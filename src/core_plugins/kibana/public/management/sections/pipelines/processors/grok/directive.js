import uiModules from 'ui/modules';
import template from './view.html';
import './grok_pattern_definitions';
import 'ui/pipelines/list_textarea';
import { pipelines as docLinks } from 'ui/documentation_links/documentation_links';

const app = uiModules.get('kibana');

//scope.processor, scope.pipeline are attached by the process_container.
app.directive('processorUiGrok', function () {
  return {
    restrict: 'E',
    template: template,
    controller : function ($scope) {
      const processor = $scope.processor;
      const pipeline = $scope.pipeline;

      $scope.docLinks = docLinks;
      $scope.$watch('processor.sourceField', () => { pipeline.setDirty(); });
      $scope.$watchCollection('processor.patterns', () => { pipeline.setDirty(); });
      $scope.$watch('processor.traceMatch', () => { pipeline.setDirty(); });
      $scope.$watchCollection('processor.patternDefinitions', () => { pipeline.setDirty(); }, true);
      $scope.$watch('processor.ignoreMissing', () => { pipeline.setDirty(); });
    }
  };
});
