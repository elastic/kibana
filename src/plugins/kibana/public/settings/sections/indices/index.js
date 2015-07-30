define(function (require) {
  var _ = require('lodash');

  require('plugins/kibana/settings/sections/indices/_create');
  require('plugins/kibana/settings/sections/indices/_edit');
  require('plugins/kibana/settings/sections/indices/_field_editor');

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
        $scope.edittingId = $route.current.params.indexPatternId;
        config.$bind($scope, 'defaultIndex');

        $scope.$watch('defaultIndex', function () {
          var ids = $route.current.locals.indexPatternIds;
          $scope.indexPatternList = ids.map(function (id) {
            return {
              id: id,
              url: kbnUrl.eval('#/settings/indices/{{id}}', {id: id}),
              class: 'sidebar-item-title ' + ($scope.edittingId === id ? 'active' : ''),
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
    url: '#/settings/indices',
  };
});
