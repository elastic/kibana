const history = require('../history');

require('ui/modules')
.get('app/sense')
.directive('senseNavbar', function () {
  return {
    restrict: 'A',
    template: require('./navbar.html'),
    controllerAs: 'navbar',
    controller: function SenseNavbarController($element) {
      this.serverUrlHistory = [];
      this.updateServerUrlHistory = function () {
        this.serverUrlHistory = history.getHistoricalServers();
      };

      this.updateServerUrlHistory();
    }
  };
});
