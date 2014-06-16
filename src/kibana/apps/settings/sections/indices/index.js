define(function (require) {
  var _ = require('lodash');

  require('./_create');
  require('./_edit');

  // add a dependency to all of the subsection routes
  require('routes')
  .addResolves(/settings\/indices/, {
    indexPatternIds: function (courier) {
      return courier.indexPatterns.getIds();
    }
  });

  // wrapper directive, which sets some global stuff up like the left nav
  require('modules').get('app/settings')
  .directive('kbnSettingsIndices', function ($route, config) {
    return {
      restrict: 'E',
      transclude: true,
      template: require('text!./index.html'),
      link: function ($scope) {
        $scope.edittingId = $route.current.params.id;
        $scope.defaultIndex = config.get('defaultIndex');
        $scope.$on('change:config.defaultIndex', function () {
          $scope.defaultIndex = config.get('defaultIndex');
        });

        $scope.$watch('defaultIndex', function (defaultIndex) {
          $scope.indexPatternList = _($route.current.locals.indexPatternIds)
            .map(function (id) {
              return {
                id: id,
                url: '#/settings/indices/' + id,
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