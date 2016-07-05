const history = require('../history');
const es = require('../es');
const storage = require('../storage');
require('ui/kbn_top_nav');
const KbnTopNavControllerProvider = require('ui/kbn_top_nav/kbn_top_nav_controller');

require('ui/modules')
.get('app/sense')
.directive('senseNavbar', function () {
  return {
    restrict: 'E',
    template: require('./sense_navbar.html'),
    require: '^ngController',
    scope: {},
    link($scope, $el, attrs, sense) {
      $scope.sense = sense
    },
    controllerAs: 'navbar',
    controller: class SenseNavbarController {
      constructor($scope, $timeout, $element, Private) {
        const KbnTopNavController = Private(KbnTopNavControllerProvider);
        $scope.chrome = require('ui/chrome');

        this.menu = new KbnTopNavController([
          {
            key: 'welcome',
            hideButton: true,
            template: `<sense-welcome></sense-welcome>`
          },
          {
            key: 'history',
            description: 'History',
            template: `<sense-history></sense-history>`
          },
          {
            key: 'settings',
            description: 'Settings',
            template: `<sense-settings></sense-settings>`
          },
          {
            key: 'help',
            description: 'Help',
            template: `<sense-help></sense-help>`
          },
        ]);

        if (storage.get('version_welcome_shown') !== '@@SENSE_REVISION') {
          this.menu.open('welcome')
        }

      }
    }
  };
});
