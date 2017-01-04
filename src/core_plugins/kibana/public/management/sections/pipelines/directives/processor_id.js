import uiModules from 'ui/modules';
import template from '../views/processor_id.html';
import ProcessorCollection from 'ui/pipelines/processor_collection/view_model';

const app = uiModules.get('kibana');

app.directive('processorId', function () {
  return {
    restrict: 'E',
    template: template,
    scope: {
      processor: '='
    },
    controller: function ($scope) {
      const processor = $scope.processor;
      $scope.oldProcessorId = processor.processorId;

      $scope.changeProcessorId = () => {
        const newVal = processor.processorId;
        const oldVal = $scope.oldProcessorId;

        const cleanedProcessorId = ProcessorCollection.updateId(oldVal, newVal);
        processor.processorId = cleanedProcessorId;
        $scope.oldProcessorId = cleanedProcessorId;
      };
    }
  };
});
