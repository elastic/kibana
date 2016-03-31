var { assign, memoize } = require('lodash');
let moment = require('moment');

var history = require('../history');
require('./sense_history_viewer');

require('ui/modules')
.get('app/sense')
.directive('senseHistory', function () {
  return {
    restrict: 'E',
    template: require('./history.html'),
    controllerAs: 'history',
    controller: function ($scope, $element) {
      this.reqs = history.getHistory();
      this.selectedReq = this.reqs[0];
      this.viewingReq = this.selectedReq;

      // calculate the text description of a request
      this.describeReq = memoize((req) => {
        const endpoint = req.endpoint;
        const date = moment(req.time);

        let formattedDate = date.format("MMM D");
        if (date.diff(moment(), "days") > -7) {
          formattedDate = date.fromNow();
        }

        return `${endpoint} (${formattedDate})`;
      });
      this.describeReq.cache = new WeakMap();

      // main actions
      this.clear = () => {
        history.clearHistory($element);
        $scope.kbnTopNav.close();
      };

      this.restore = (req = this.selectedReq) => {
        history.restoreFromHistory(req);
        $scope.kbnTopNav.close();
      };
    }
  };
});
