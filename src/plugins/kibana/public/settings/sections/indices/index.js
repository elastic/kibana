import _ from 'lodash';
import registry from '../../../../../../ui/public/registry/settings_sections';
import 'plugins/kibana/settings/sections/indices/_create';
import 'plugins/kibana/settings/sections/indices/_edit';
import 'plugins/kibana/settings/sections/indices/_field_editor';
import uiRoutes from '../../../../../../ui/public/routes';
import uiModules from '../../../../../../ui/public/modules';
import indexTemplate from 'plugins/kibana/settings/sections/indices/index.html';


// add a dependency to all of the subsection routes
uiRoutes
.defaults(/settings\/indices/, {
  resolve: {
    indexPatternIds: function (courier) {
      return courier.indexPatterns.getIds();
    }
  }
});

// wrapper directive, which sets some global stuff up like the left nav
uiModules.get('apps/settings')
.directive('kbnSettingsIndices', function ($route, config, kbnUrl) {
  return {
    restrict: 'E',
    transclude: true,
    template: indexTemplate,
    link: function ($scope) {
      $scope.editingId = $route.current.params.indexPatternId;
      config.bindToScope($scope, 'defaultIndex');

      $scope.$watch('defaultIndex', function () {
        const ids = $route.current.locals.indexPatternIds;
        $scope.indexPatternList = ids.map(function (id) {
          return {
            id: id,
            url: kbnUrl.eval('#/settings/indices/{{id}}', {id: id}),
            class: 'sidebar-item-title ' + ($scope.editingId === id ? 'active' : ''),
            default: $scope.defaultIndex === id
          };
        });
      });

      $scope.$emit('application.load');
    }
  };
});

registry.register(_.constant({
  order: 1,
  name: 'indices',
  display: 'Indices',
  url: '#/settings/indices'
}));
