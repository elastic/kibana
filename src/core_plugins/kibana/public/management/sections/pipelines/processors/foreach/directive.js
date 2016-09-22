import uiModules from 'ui/modules';
import template from './view.html';
import './styles.less';

const app = uiModules.get('kibana');

//scope.pipeline, scope.processor are attached by the process_container.
app.directive('processorUiForeach', function () {
  return {
    restrict: 'E',
    template: template,
    controller : function ($scope) {
      const processor = $scope.processor;
      const pipeline = $scope.pipeline;

      $scope.$watch('processor.targetField', () => {
        $scope.processor.updateProcessorCollection();
        pipeline.setDirty();
      });

      $scope.defineProcessors = () => {
        $scope.pipeline.pushProcessorCollection(processor.processorCollection);
      };
    }
  };
});
