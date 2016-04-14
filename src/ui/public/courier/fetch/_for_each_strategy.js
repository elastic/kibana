define(function (require) {
  return function FetchForEachRequestStrategy(Private, Promise) {
    let _ = require('lodash');

    function forEachStrategy(requests, block) {
      block = Promise.method(block);
      let sets = [];

      requests.forEach(function (req) {
        let strategy = req.strategy;
        let set = _.find(sets, { 0: strategy });
        if (set) set[1].push(req);
        else sets.push([strategy, [req]]);
      });

      return Promise.all(sets.map(function (set) {
        return block(set[0], set[1]);
      }));
    }

    return forEachStrategy;
  };
});
