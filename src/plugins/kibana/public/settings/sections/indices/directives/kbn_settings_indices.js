// wrapper directive, which sets some global stuff up like the left nav
require('ui/modules').get('apps/settings')
.directive('kbnSettingsIndices', function ($route, config, kbnUrl) {
  return {
    restrict: 'E',
    transclude: true,
    template: require('plugins/kibana/settings/sections/indices/directives/kbn_settings_indices.html'),
    link: function ($scope) {
      $scope.edittingId = $route.current.params.indexPatternId;
      config.$bind($scope, 'defaultIndex');

      $scope.$watch('defaultIndex', function () {
        var ids = $route.current.locals.indexPatternIds;
        $scope.indexPatternList = ids.map(function (id) {
          return {
            id: id,
            url: kbnUrl.eval('#/settings/indices/edit/{{id}}', {id: id}),
            class: 'sidebar-item-title ' + ($scope.edittingId === id ? 'active' : ''),
            default: $scope.defaultIndex === id
          };
        });
      });

      $scope.$emit('application.load');
    }
  };
});
