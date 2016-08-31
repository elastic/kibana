import uiRoutes from 'ui/routes';
import uiModules from 'ui/modules';
import template from 'plugins/kibana/dev_tools/index.html';
import chrome from 'ui/chrome/chrome';
import devTools from 'ui/registry/dev_tools';

uiRoutes
.when('/dev_tools', {
  template: '<kbn-dev-tools-app></kbn-dev-tools-app>'
});

uiModules
.get('apps/dev_tools')
.directive('kbnDevToolsApp', function (Private) {
  return {
    restrict: 'E',
    template,
    transclude: true,
    link: function ($scope) {
      $scope.devTools = Private(devTools).inOrder;
    }
  };
});
