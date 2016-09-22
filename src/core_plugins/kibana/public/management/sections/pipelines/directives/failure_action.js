import uiModules from 'ui/modules';
import template from '../views/failure_action.html';
import '../styles/_failure_action.less';

const app = uiModules.get('kibana');

app.directive('failureAction', function () {
  return {
    restrict: 'E',
    template: template,
    scope: {
      failureAction: '=',
      processorCollection: '=',
      pipeline: '=',
      options: '='
    },
    controller: function ($scope) {
      $scope.defineProcessors = () => {
        $scope.pipeline.pushProcessorCollection($scope.processorCollection);
      };

      $scope.$watch('failureAction', () => { $scope.pipeline.setDirty(); });
    }
  };
});
