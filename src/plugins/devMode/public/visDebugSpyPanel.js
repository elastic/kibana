define(function (require) {
  // register the spy mode or it won't show up in the spys
  require('ui/registry/spy_modes').register(VisDetailsSpyProvider);

  function VisDetailsSpyProvider(Notifier, $filter, $rootScope, config) {
    require('ui/clipboard');

    return {
      name: 'debug',
      display: 'Debug',
      template: require('plugins/devMode/visDebugSpyPanel.html'),
      order: 5,
      link: function ($scope, $el) {
        $scope.$watch('vis.getState() | json', function (json) {
          $scope.visStateJson = json;
        });
      }
    };
  }

  return VisDetailsSpyProvider;
});
