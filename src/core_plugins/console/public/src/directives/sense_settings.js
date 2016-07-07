require('ui/directives/input_focus');

require('ui/modules')
.get('app/sense')
.directive('senseSettings', function () {
  return {
    restrict: 'E',
    template: require('./settings.html'),
    controllerAs: 'settings',
    controller: function ($scope) {
      const settings = require('../settings');

      this.vals = settings.getCurrentSettings();
      this.apply = () => {
        this.vals = settings.updateSettings(this.vals);
        $scope.kbnTopNav.close();
      };

    },
  };
});
