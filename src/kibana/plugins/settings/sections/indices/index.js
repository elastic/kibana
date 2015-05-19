define(function (require) {
  var _ = require('lodash');

  require('plugins/settings/sections/indices/_create');
  require('plugins/settings/sections/indices/_edit');
  require('plugins/settings/sections/indices/_field_editor');

  // add a dependency to all of the subsection routes
  require('routes')
  .defaults(/settings\/indices/, {
    resolve: {
      indexPatternIds: function (courier) {
        return courier.indexPatterns.getIds();
      }
    }
  });

  // wrapper directive, which sets some global stuff up like the left nav
  require('modules').get('apps/settings')
  .directive('kbnSettingsIndices', function ($route, config, kbnUrl) {
    return {
      restrict: 'E',
      transclude: true,
      template: require('text!plugins/settings/sections/indices/index.html'),
      link: function ($scope) {
        $scope.edittingId = $route.current.params.indexPatternId;
        config.$bind($scope, 'defaultIndex');

        $scope.$watch('defaultIndex', function () {
          $scope.indexPatternList = _($route.current.locals.indexPatternIds)
            .map(function (id) {
              return {
                id: id,
                url: kbnUrl.eval('#/settings/indices/{{id}}', {id: id}),
                class: 'sidebar-item-title ' + ($scope.edittingId === id ? 'active' : ''),
                default: $scope.defaultIndex === id
              };
            })
            .value();
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
