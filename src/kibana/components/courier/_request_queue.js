define(function (require) {
  return function PendingRequestList() {
    var _ = require('lodash');

    /**
     * Queue of pending requests, requests are removed as
     * they are processed by fetch.[sourceType]().
     * @type {Array}
     */
    var queue = window.requestQueue = [];

    function getQualified(strategies, qualify) {
      return queue.filter(function (req) {
        var strategyMatch = !strategies.length;
        if (!strategyMatch) {
          strategyMatch = strategies.some(function (strategy) {
            return req.strategy === strategy;
          });
        }

        return strategyMatch && qualify(req);
      });
    }

    queue.getPending = function (/* strategies.. */) {
      return getQualified(_.toArray(arguments), function (req) {
        return req.isReady();
      });
    };


    queue.getIncomplete = function (/* strategies.. */) {
      return getQualified(_.toArray(arguments), function (req) {
        return req.isIncomplete();
      });
    };

    return queue;
  };
});