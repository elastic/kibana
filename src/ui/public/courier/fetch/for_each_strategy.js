import _ from 'lodash';

export default function FetchForEachRequestStrategy(Private, Promise) {
  function forEachStrategy(requests, block) {
    block = Promise.method(block);
    const sets = [];

    requests.forEach(function (req) {
      const strategy = req.strategy;
      const set = _.find(sets, { 0: strategy });
      if (set) set[1].push(req);
      else sets.push([strategy, [req]]);
    });

    return Promise.all(sets.map(function (set) {
      return block(set[0], set[1]);
    }));
  }

  return forEachStrategy;
}
