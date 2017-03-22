import visDebugSpyPanelTemplate from 'plugins/dev_mode/vis_debug_spy_panel.html';
// register the spy mode or it won't show up in the spys
require('ui/registry/spy_modes').register(VisDetailsSpyProvider);

function VisDetailsSpyProvider() {
  return {
    name: 'debug',
    display: 'Debug',
    template: visDebugSpyPanelTemplate,
    order: 5,
    link: function($scope) {
      $scope.$watch('vis.getEnabledState() | json', function (json) {
        $scope.visStateJson = json;
      });
    }
  };
}

export default VisDetailsSpyProvider;
