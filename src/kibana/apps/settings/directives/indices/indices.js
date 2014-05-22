define(function (require) {
  var _ = require('lodash');

  require('../../_sections').push({
    order: 1,
    name: 'indices',
    display: 'Indices',
    url: '#/settings/indices',
  });

  require('routes')
  .addResolves(/settings\/indices/, {
    indexPatternIds: function (courier) {
      return courier.indexPatterns.getIds();
    }
  });

  require('modules').get('app/settings')
  .directive('kbnSettingsIndices', function ($route, config) {
    return {
      restrict: 'E',
      transclude: true,
      template: require('text!../../partials/indices/indices.html'),
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


});
