import visDebugSpyPanelTemplate from 'plugins/devMode/visDebugSpyPanel.html';
// register the spy mode or it won't show up in the spys
require('ui/registry/spy_modes').register(VisDetailsSpyProvider);

function VisDetailsSpyProvider(Notifier, $filter, $rootScope, config) {
  return {
    name: 'debug',
    display: 'Debug',
    template: visDebugSpyPanelTemplate,
    order: 5,
    link: function ($scope, $el) {
      $scope.$watch('vis.getState() | json', function (json) {
        $scope.visStateJson = json;
      });
    }
  };
}

export default VisDetailsSpyProvider;
