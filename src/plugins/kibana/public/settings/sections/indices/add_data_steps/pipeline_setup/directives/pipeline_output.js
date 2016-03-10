import uiModules from 'ui/modules';

require('../styles/_pipeline_output.less');

const module = uiModules.get('kibana');

module.directive('pipelineOutput', function () {
  return {
    restrict: 'E',
    template: require('../views/pipeline_output.html'),
    scope: {
      pipeline: '='
    },
    controller: function ($scope) {
      $scope.collapsed = true;
    }
  };
});
