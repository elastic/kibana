const history = require('../history');
const es = require('../es');
const storage = require('../storage');

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
      $scope.navbar.link($scope)
    },
    controllerAs: 'navbar',
    controller: class SenseNavbarController {
      constructor($scope) {
        $scope.chrome = require('ui/chrome');

        this.menu = [
          {
            key: 'welcome',
            noButton: true,
            openByDefault: storage.get('version_welcome_shown') !== '@@SENSE_REVISION',
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
        ];

        this.updateServerUrlHistory();
      }

      link($scope) {
        $scope.$watch('sense.serverUrl', (url) => {
          this.serverUrlFormModel = url
        })
      }

      updateServerUrlHistory() {
        this.serverUrlHistory = history.getHistoricalServers();
      }

      commitServerUrlFormModel() {
        es.setBaseUrl(this.serverUrlFormModel);
      }
    }
  };
});
