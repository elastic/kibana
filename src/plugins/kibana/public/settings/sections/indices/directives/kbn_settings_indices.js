import PluginsKibanaSettingsSectionsIndicesRefreshKibanaIndexProvider from 'plugins/kibana/settings/sections/indices/_refresh_kibana_index';
import uiModules from 'ui/modules';
import kbnSettingsIndicesTemplate from 'plugins/kibana/settings/sections/indices/directives/kbn_settings_indices.html';

// wrapper directive, which sets some global stuff up like the left nav
uiModules.get('apps/settings')
.directive('kbnSettingsIndices', function ($route, config, kbnUrl, indexPatterns, Private) {
  return {
    restrict: 'E',
    transclude: true,
    template: kbnSettingsIndicesTemplate,
    link: function ($scope) {
      const refreshKibanaIndex = Private(PluginsKibanaSettingsSectionsIndicesRefreshKibanaIndexProvider);

      $scope.showAddNew = !/^\/settings\/indices$/.test($route.current.$$route.originalPath);
      $scope.editingId = $route.current.params.indexPatternId;
      config.bindToScope($scope, 'defaultIndex');

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
