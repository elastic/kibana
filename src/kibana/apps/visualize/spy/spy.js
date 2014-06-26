define(function (require) {
  require('modules')
    .get('apps/visualize')
    .directive('visualizeSpy', function (Private, $compile) {
      var $ = require('jquery');
      var _ = require('lodash');

      var modes = _.flatten([
        Private(require('apps/visualize/spy/_table')),
        Private(require('apps/visualize/spy/_req_resp_stats'))
      ]);
      modes.byName = _.indexBy(modes, 'name');

      return {
        restrict: 'E',
        template: require('text!apps/visualize/spy/_spy.html'),
        link: function ($scope, $el) {
          $scope.spyMode = null;
          $scope.modes = modes;

          $scope.toggleExtra = function (newMode) {
            var current = $scope.spyMode;

            if (current) {
              current.$container.remove();
              current.$scope.$destroy();
            }

            if (current && current.name === newMode) {
              // toggle out the current extra, don't proceed any further
              return $scope.setCurrentExtra(null);
            }

            current = {
              name: newMode.name,
              display: newMode.display,
              $scope: $scope.$new(),
              $container: $('<div class="visualize-extra-container">').appendTo($el)
            };

            current.$container.append($compile(newMode.template)(current.$scope));
            newMode.link(current.$scope, current.$container);
            $scope.setCurrentExtra(current);
          };
        }
      };
    });
});