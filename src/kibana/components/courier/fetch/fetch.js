define(function (require) {
  return function fetchService(Private, Promise) {
    var _ = require('lodash');

    var strategies = this.strategies = {
      doc: Private(require('components/courier/fetch/strategy/doc')),
      search: Private(require('components/courier/fetch/strategy/search'))
    };

    var requestQueue = Private(require('components/courier/_request_queue'));
    var fetchThese = Private(require('components/courier/fetch/_fetch_these'));

    var callResponseHandlers = Private(require('components/courier/fetch/_call_response_handlers'));
    var INCOMPLETE = Private(require('components/courier/fetch/_req_status')).INCOMPLETE;

    function fetchQueued(strategy) {
      var requests = requestQueue.get(strategy);
      if (!requests.length) return Promise.resolve();
      else return fetchThese(requests);
    }

    /**
     * Fetch all pending docs that are ready to be fetched
     * @async
     */
    this.docs = _.partial(fetchQueued, strategies.doc);

    /**
     * Fetch all pending search requests
     * @async
     */
    this.searches = _.partial(fetchQueued, strategies.search);


    function fetchASource(source, strategy) {
      strategy = strategy || strategies[source._getType()];
      var defer = Promise.defer();

      fetchThese([
        source._createRequest(defer.resolve)
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