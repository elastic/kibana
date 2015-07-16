define(function (require) {
  // register the spy mode or it won't show up in the spys
  require('registry/spy_modes').register(VisDetailsSpyProvider);

  function VisDetailsSpyProvider(Notifier, $filter, $rootScope, config) {
    require('ui/clipboard/clipboard');

    return {
      name: 'debug',
      display: 'Debug',
      template: require('plugins/vis_debug_spy/vis_debug_spy.html'),
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
