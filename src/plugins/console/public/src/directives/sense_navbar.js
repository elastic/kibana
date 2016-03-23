const history = require('../history');
const es = require('../es');

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
