
/**
 * Queue of pending requests, requests are removed as
 * they are processed by fetch.[sourceType]().
 * @type {Array}
 */
export const requestQueue = [];

requestQueue.clear = function () {
  requestQueue.splice(0, requestQueue.length);
};

requestQueue.getInactive = function (/* strategies */) {
  return requestQueue.get.apply(requestQueue, arguments)
    .filter(function (req) {
      return !req.started;
    });
};

requestQueue.getStartable = function (...strategies) {
  return requestQueue.get(...strategies).filter(req => req.canStart());
};

requestQueue.get = function (...strategies) {
  return requestQueue.filter(function (req) {
    let strategyMatch = !strategies.length;
    if (!strategyMatch) {
      strategyMatch = strategies.some(function (strategy) {
        return req.strategy === strategy;
      });
    }

    return strategyMatch;
  });
};

