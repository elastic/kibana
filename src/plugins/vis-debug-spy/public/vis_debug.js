define(function (require) {
  return function VisDetailsSpyProvider(Notifier, $filter, $rootScope, config) {
    return {
      name: 'debug',
      display: 'Debug',
      template: require('text!plugins/vis_debug_spy/vis_debug.html'),
      order: 5,
      link: function ($scope, $el) {
        $scope.$watch('vis.getState() | json', function (json) {
          $scope.visStateJson = json;
        });
      }
    };
  };
});
