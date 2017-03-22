import * as settings from '../settings';
require('ui/directives/input_focus');

require('ui/modules')
.get('app/sense')
.directive('senseSettings', function () {
  return {
    restrict: 'E',
    template: require('./settings.html'),
    controllerAs: 'settings',
    controller: function ($scope, $element) {
      this.vals = settings.getCurrentSettings();
      this.apply = () => {
        this.vals = settings.updateSettings(this.vals);
        $scope.kbnTopNav.close();
      };

      const self = this;

      function onEnter(event) {
        if (event.which === 13) {
          self.apply();
        }
      }

      const boundElement = $element.bind('keydown', onEnter);
      $scope.$on('$destroy', () => boundElement.unbind('keydown', onEnter));
    },
  };
});
