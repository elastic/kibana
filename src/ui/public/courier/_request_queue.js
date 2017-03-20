export default function PendingRequestList() {

  /**
   * Queue of pending requests, requests are removed as
   * they are processed by fetch.[sourceType]().
   * @type {Array}
   */
  const queue = [];

  queue.getInactive = function (/* strategies */) {
    return queue.get.apply(queue, arguments)
    .filter(function (req) {
      return !req.started;
    });
  };

  queue.getStartable = function (...strategies) {
    return queue.get(...strategies).filter(req => req.canStart());
  };

  queue.get = function (...strategies) {
    return queue.filter(function (req) {
      let strategyMatch = !strategies.length;
      if (!strategyMatch) {
        strategyMatch = strategies.some(function (strategy) {
          return req.strategy === strategy;
        });
      }

      return strategyMatch;
    });
  };

  return queue;
}
