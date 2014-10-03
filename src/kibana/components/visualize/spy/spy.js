define(function (require) {
  require('modules')
    .get('app/visualize')
    .directive('visualizeSpy', function (Private, $compile) {
      var $ = require('jquery');
      var _ = require('lodash');

      var modeScope;
      var modes = _.flatten([
        Private(require('components/visualize/spy/_table')),
        Private(require('components/visualize/spy/_req_resp_stats'))
      ]);
      modes.byName = _.indexBy(modes, 'name');

      var defaultMode = modes[0];

      function renderSpyMode(spyMode) {
        spyMode.$scope.extended = spyMode.fill;

        var mode = modes.byName[spyMode.name];
        mode.link(spyMode.$scope, spyMode.$container);
      }

      return {
        restrict: 'E',
        template: require('text!components/visualize/spy/_spy.html'),
        link: function ($scope, $el) {
          var fullPageSpy = false;
          $scope.spyMode = null;
          $scope.modes = modes;

          $scope.toggleDisplay = function () {
            $scope.setSpyMode($scope.spyMode ? null : defaultMode);
          };

          $scope.toggleFullPage = function () {
            fullPageSpy = $scope.spyMode.fill = !fullPageSpy;

            // re-render the current mode
            renderSpyMode($scope.spyMode);

            // tell any listeners spyMode changed
            $scope.$emit('change:spyMode', $scope.spyMode);
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

              modeScope = $scope.$new();
              modeScope.extended = fullPageSpy;
              change = true;
              current = $scope.spyMode = {
                // copy a couple values over
                name: newMode.name,
                display: newMode.display,
                fill: fullPageSpy,
                $scope: modeScope,
                $container: $('<div class="visualize-spy-container">').appendTo($el)
              };

              current.$container.append($compile(newMode.template)(current.$scope));
              // newMode.link(current.$scope, current.$container);
              renderSpyMode(current);
            }

            // wrapped in fn to enable early return
            set();

            if (change) $scope.$emit('change:spyMode', newMode);
          };
        }
      };
    });
});