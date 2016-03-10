// wrapper directive, which sets some global stuff up like the left nav
require('ui/modules').get('apps/settings')
.directive('kbnSettingsIndices', function ($route, config, kbnUrl, indexPatterns, Private) {
  return {
    restrict: 'E',
    transclude: true,
    template: require('plugins/kibana/settings/sections/indices/directives/kbn_settings_indices.html'),
    link: function ($scope) {
      const refreshKibanaIndex = Private(require('plugins/kibana/settings/sections/indices/_refresh_kibana_index'));

      $scope.showAddNew = !/^\/settings\/indices$/.test($route.current.$$route.originalPath);
      $scope.editingId = $route.current.params.indexPatternId;
      config.$bind($scope, 'defaultIndex');

      function refreshIndexPatternList() {
        indexPatterns.getIds.clearCache();
        indexPatterns.getIds()
        .then((ids) => {
          $scope.indexPatternIds = ids;
          $scope.indexPatternList = ids.map(function (id) {
            return {
              id: id,
              url: kbnUrl.eval('#/settings/indices/edit/{{id}}', {id: id}),
              class: 'sidebar-item-title ' + ($scope.editingId === id ? 'active' : ''),
              default: $scope.defaultIndex === id
            };
          });
        });
      }

      $scope.$watch('defaultIndex', refreshIndexPatternList);

      $scope.$on('ingest:updated', () => {
        refreshKibanaIndex().then(refreshIndexPatternList);
      });

      $scope.$emit('application.load');
    }
  };
});
