require('./sense_help_example');

import storage from '../storage';

require('ui/modules')
.get('app/sense')
.directive('senseWelcome', function () {
  return {
    restrict: 'E',
    template: require('./welcome.html'),
    link: function ($scope) {
      $scope.$on('$destroy', function () {
        storage.set('version_welcome_shown', '@@SENSE_REVISION');
      });
    }
  }
});
