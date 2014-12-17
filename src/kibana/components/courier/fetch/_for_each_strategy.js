define(function (require) {
  return function FetchForEachRequestStrategy(Private, Promise, Notifier) {
    var _ = require('lodash');
    var pendingRequests = Private(require('components/courier/_pending_requests'));

    var notify = new Notifier({
      location: 'Courier Fetch'
    });

    function forEachStrategy(requests, block) {
      block = Promise.method(block);
      var sets = [];

      requests.forEach(function (req) {
        var strategy = req.strategy;
        var set = _.find(sets, { 0: strategy });
        if (set) set[1].push(req);
        else sets.push([strategy, [req]]);
      });

      return Promise.all(sets.map(function (set) {
        return (function fetch(requests, strategy) {

          return block(requests, strategy)
          .then(function checkForIncompleteRequests(result) {
            if (_.isFunction(strategy.getIncompleteRequests)) {
              var incomplete = strategy.getIncompleteRequests(pendingRequests);
              if (incomplete.length) {
                return fetch(incomplete, strategy);
              }
            }
            return result;
          });

        }(set[1], set[0]));
      }))
      .catch(notify.fatal);
    }

    return forEachStrategy;
  };
});