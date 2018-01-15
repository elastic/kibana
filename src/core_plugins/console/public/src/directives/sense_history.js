import { keyCodes } from '@elastic/eui';

var { memoize } = require('lodash');
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
      this.selectedIndex = 0;
      this.selectedReq = this.reqs[this.selectedIndex];
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

      this.onKeyDown = (ev) => {
        if (ev.keyCode === keyCodes.ENTER) {
          this.restore();
          return;
        }

        if (ev.keyCode === keyCodes.UP) {
          ev.preventDefault();
          this.selectedIndex--;
        } else if (ev.keyCode === keyCodes.DOWN) {
          ev.preventDefault();
          this.selectedIndex++;
        }

        this.selectedIndex = Math.min(Math.max(0, this.selectedIndex), this.reqs.length - 1);
        this.selectedReq = this.reqs[this.selectedIndex];
        this.viewingReq = this.reqs[this.selectedIndex];
      };
    }
  };
});
