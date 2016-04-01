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
      constructor($scope, $timeout, $element) {
        $scope.chrome = require('ui/chrome');

        this.menu = [
          {
            key: 'welcome',
            noButton: true,
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

        $timeout(function tryToOpenWelcomeTemplate() {
          if (storage.get('version_welcome_shown') === '@@SENSE_REVISION') {
            return;
          }

          const $topNavScope = $element.find('kbn-top-nav').scope();
          if ($topNavScope && $topNavScope.kbnTopNav) {
            $topNavScope.kbnTopNav.open('welcome')
          } else {
            $timeout(tryToOpenWelcomeTemplate, 10);
          }
        }, 0)

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
