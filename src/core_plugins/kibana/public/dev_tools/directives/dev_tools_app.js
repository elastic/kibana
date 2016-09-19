import uiModules from 'ui/modules';
import devTools from 'ui/registry/dev_tools';
import template from 'plugins/kibana/dev_tools/partials/dev_tools_app.html';
import 'plugins/kibana/dev_tools/styles/dev_tools_app.less';
import 'ui/kbn_top_nav';

uiModules
.get('apps/dev_tools')
.directive('kbnDevToolsApp', function (Private, $location) {
  return {
    restrict: 'E',
    replace: true,
    template,
    transclude: true,
    link: function ($scope) {
      $scope.devTools = Private(devTools).inOrder;
      $scope.currentPath = `#${$location.path()}`;
    }
  };
});
