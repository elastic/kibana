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
      var defaultMode = modes[0];
      modes.byName = _.indexBy(modes, 'name');

      return {
        restrict: 'E',
        template: require('text!apps/visualize/spy/_spy.html'),
        link: function ($scope, $el) {
          $scope.spyMode = null;
          $scope.modes = modes;

          $scope.toggleDisplay = function () {
            $scope.setSpyMode($scope.spyMode ? null : defaultMode);
          };

          $scope.setSpyMode = function (newMode) {
            // allow passing in a mode name
            if (_.isString(newMode)) newMode = modes.byName[newMode];

            var current = $scope.spyMode;
            var change = false;

            function set() {
              // no change
              if (current && newMode && newMode.name === current.name) return;

              // clear the current value
              if (current) {
                current.$container.remove();
                current.$scope.$destroy();
                delete $scope.spyMode;
                current = null;
                change = true;
              }

              // no further changes
              if (!newMode) return;

              change = true;
              current = $scope.spyMode = {
                // copy a couple values over
                name: newMode.name,
                display: newMode.display,
                $scope: $scope.$new(),
                $container: $('<div class="visualize-spy-container">').appendTo($el)
              };

              current.$container.append($compile(newMode.template)(current.$scope));
              newMode.link(current.$scope, current.$container);
            }

            // wrapped in fn to enable early return
            set();
            if (change) $scope.$emit('change:spyMode', newMode);
          };
        }
      };
    });
});