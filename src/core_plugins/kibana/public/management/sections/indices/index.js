import management from 'ui/management';
import 'plugins/kibana/management/sections/indices/_create';
import 'plugins/kibana/management/sections/indices/_edit';
import 'plugins/kibana/management/sections/indices/_field_editor';
import 'plugins/kibana/management/sections/indices/upload';
import uiRoutes from 'ui/routes';
import uiModules from 'ui/modules';
import indexTemplate from 'plugins/kibana/management/sections/indices/index.html';

const indexPatternsResolutions = {
  indexPatternIds: function (courier) {
    return courier.indexPatterns.getIds();
  }
};

// add a dependency to all of the subsection routes
uiRoutes
.defaults(/management\/kibana\/indices/, {
  resolve: indexPatternsResolutions
});

uiRoutes
.defaults(/management\/data\/index/, {
  resolve: indexPatternsResolutions
});

// wrapper directive, which sets some global stuff up like the left nav
uiModules.get('apps/management')
.directive('kbnManagementIndices', function ($route, config, kbnUrl) {
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
            url: kbnUrl.eval('#/management/kibana/indices/{{id}}', {id: id}),
            class: 'sidebar-item-title ' + ($scope.editingId === id ? 'active' : ''),
            default: $scope.defaultIndex === id
          };
        });
      });

      $scope.$emit('application.load');
    }
  };
});

management.getSection('data').register('indices', {
  display: 'Existing Data',
  order: 0,
  url: '#/management/data/index/'
});

management.getSection('kibana').register('indices', {
  display: 'Index Patterns',
  order: 0,
  url: '#/management/kibana/indices/'
});
