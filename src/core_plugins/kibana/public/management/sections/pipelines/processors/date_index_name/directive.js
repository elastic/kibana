import uiModules from 'ui/modules';
import template from './view.html';
import 'ui/pipelines/list_textarea';

const app = uiModules.get('kibana');

//scope.pipeline, scope.processor are attached by the process_container.
app.directive('processorUiDateIndexName', function () {
  return {
    restrict: 'E',
    template: template,
    controller : function ($scope) {
      const processor = $scope.processor;
      const pipeline = $scope.pipeline;

      $scope.roundingTypes = [
        { value: 'y', label: 'Year' },
        { value: 'M', label: 'Month' },
        { value: 'w', label: 'Week' },
        { value: 'd', label: 'Day' },
        { value: 'h', label: 'Hour' },
        { value: 'm', label: 'Minute' },
        { value: 's', label: 'Second' }
      ];

      $scope.$watch('processor.sourceField', () => { pipeline.setDirty(); });
      $scope.$watch('processor.indexNamePrefix', () => { pipeline.setDirty(); });
      $scope.$watch('processor.dateRounding', () => { pipeline.setDirty(); });
      $scope.$watch('processor.dateFormats', () => { pipeline.setDirty(); });
      $scope.$watch('processor.timezone', () => { pipeline.setDirty(); });
      $scope.$watch('processor.locale', () => { pipeline.setDirty(); });
      $scope.$watch('processor.indexNameFormat', () => { pipeline.setDirty(); });
    }
  };
});
