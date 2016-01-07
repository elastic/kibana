const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');

app.directive('pipelineOutput', function () {
  return {
    restrict: 'E',
    template: require('../views/pipeline_output.html'),
    scope: {
      lastProcessor: '='
    },
    controller: function ($scope) {
      function processorUpdated(event, message) {
        if (message.processor !== $scope.lastProcessor) return;

        $scope.outputObject = message.processor.outputObject;
      }

      const updateListener = $scope.$on('processor_update', processorUpdated);

      $scope.$on('$destroy', () => {
        updateListener();
      });

      $scope.collapsed = true;
    }
  };
});
