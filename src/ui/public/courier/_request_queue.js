
/**
 * Queue of pending requests, requests are removed as
 * they are processed by fetch.[sourceType]().
 * @type {Array}
 */
export const requestQueue = [];

requestQueue.clear = function () {
  requestQueue.splice(0, requestQueue.length);
};

requestQueue.getInactive = function () {
  return requestQueue.filter(function (req) {
    return !req.started;
  });
};

requestQueue.getStartable = function () {
  return requestQueue.filter(req => req.canStart());
};


