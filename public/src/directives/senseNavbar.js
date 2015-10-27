const history = require('../history');
const es = require('../es');

require('ui/modules')
.get('app/sense')
.directive('senseNavbar', function () {
  return {
    restrict: 'A',
    template: require('./navbar.html'),
    controllerAs: 'navbar',
    controller: function SenseNavbarController($scope, $element) {
      this.serverUrlHistory = [];
      this.updateServerUrlHistory = function () {
        this.serverUrlHistory = history.getHistoricalServers();
      };

      this.updateServerUrlHistory();

      this.commitServerUrlFormModel = () => {
        es.setBaseUrl(this.serverUrlFormModel);
      };

      $scope.$watch('sense.serverUrl', (serverUrl) => {
        this.serverUrlFormModel = serverUrl;
      });
    }
  };
});
