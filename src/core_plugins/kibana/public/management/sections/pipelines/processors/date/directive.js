import _ from 'lodash';
import uiModules from 'ui/modules';
import template from './view.html';
import './styles.less';

const app = uiModules.get('kibana');

//scope.processor, scope.pipeline are attached by the process_container.
app.directive('processorUiDate', function () {
  return {
    restrict: 'E',
    template: template,
    controller : function ($scope, debounce) {
      const processor = $scope.processor;
      const pipeline = $scope.pipeline;

      $scope.$watch('processor.sourceField', () => { pipeline.setDirty(); });
      $scope.$watch('processor.formats', () => { pipeline.setDirty(); });
      $scope.$watch('processor.targetField', () => { pipeline.setDirty(); });
      $scope.$watch('processor.timezone', () => { pipeline.setDirty(); });
      $scope.$watch('processor.locale', () => { pipeline.setDirty(); });
    }
  };
});
