import _ from 'lodash';
import 'plugins/kibana/settings/sections/indices/_create';
import 'plugins/kibana/settings/sections/indices/_edit';
import 'plugins/kibana/settings/sections/indices/_field_editor';
define(function (require) {


  // add a dependency to all of the subsection routes
  require('ui/routes')
  .defaults(/settings\/indices/, {
    resolve: {
      indexPatternIds: function (courier) {
        return courier.indexPatterns.getIds();
      }
    }
  });

  // wrapper directive, which sets some global stuff up like the left nav
  require('ui/modules').get('apps/settings')
  .directive('kbnSettingsIndices', function ($route, config, kbnUrl) {
    return {
      restrict: 'E',
      transclude: true,
      template: require('plugins/kibana/settings/sections/indices/index.html'),
      link: function ($scope) {
        $scope.editingId = $route.current.params.indexPatternId;
        config.$bind($scope, 'defaultIndex');

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

  return {
    name: 'indices',
    display: 'Indices',
    url: function () {
      const hash = window.location.hash;
      return hash.indexOf('/indices') === -1 ? '#/settings/indices?' + hash.split('?')[1] : '#/settings/indices';
    }
  };
});
