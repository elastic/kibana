define(function (require) {
  return function fetchService(Private, Promise) {
    let _ = require('lodash');

    let requestQueue = Private(require('ui/courier/_request_queue'));
    let fetchThese = Private(require('ui/courier/fetch/_fetch_these'));

    let callResponseHandlers = Private(require('ui/courier/fetch/_call_response_handlers'));
    let INCOMPLETE = Private(require('ui/courier/fetch/_req_status')).INCOMPLETE;

    function fetchQueued(strategy) {
      let requests = requestQueue.getStartable(strategy);
      if (!requests.length) return Promise.resolve();
      else return fetchThese(requests);
    }

    this.fetchQueued = fetchQueued;

    function fetchASource(source, strategy) {
      let defer = Promise.defer();

      fetchThese([
        source._createRequest(defer)
      ]);

      return defer.promise;
    }

    /**
     * Fetch a single doc source
     * @param {DocSource} source - The DocSource to request
     * @async
     */
    this.doc = fetchASource;

    /**
     * Fetch a single search source
     * @param {SearchSource} source - The SearchSource to request
     * @async
     */
    this.search = fetchASource;

    /**
     * Fetch a list of requests
     * @param {array} reqs - the requests to fetch
     * @async
     */
    this.these = fetchThese;

    /**
     * Send responses to a list of requests, used when requests
     * should be skipped (like when a doc is updated with an index).
     *
     * This logic is a simplified version of what fetch_these does, and
     * could have been added elsewhere, but I would rather the logic be
     * here than outside the courier/fetch module.
     *
     * @param {array[Request]} requests - the list of requests to respond to
     * @param {array[any]} responses - the list of responses for each request
     */
    this.fakeFetchThese = function (requests, responses) {
      return Promise.map(requests, function (req) {
        return req.start();
      })
      .then(function () {
        return callResponseHandlers(requests, responses);
      })
      .then(function (requestStates) {
        if (_.contains(requestStates, INCOMPLETE)) {
          throw new Error('responding to requests did not complete!');
        }
      });
    };
  };
});
