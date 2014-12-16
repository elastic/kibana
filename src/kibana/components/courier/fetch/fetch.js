define(function (require) {
  return function fetchService(Private, Promise) {
    var _ = require('lodash');

    var strategies = this.strategies = {
      doc: Private(require('components/courier/fetch/strategy/doc')),
      search: Private(require('components/courier/fetch/strategy/search')),
      segmented: Private(require('components/courier/fetch/strategy/segmented'))
    };

    var RequestErrorHandler = Private(require('components/courier/fetch/_request_error_handler'));
    var pendingRequests = Private(require('components/courier/_pending_requests'));
    var fetchThese = Private(require('components/courier/fetch/_fetch_these'));

    function fetchPending(strategy) {
      var requests = strategy.getPendingRequests(pendingRequests);
      if (!requests.length) return Promise.resolve();
      else return fetchThese(requests, new RequestErrorHandler());
    }

    /**
     * Fetch all pending docs that are ready to be fetched
     * @async
     */
    this.docs = _.partial(fetchPending, strategies.doc);

    /**
     * Fetch all pending search requests
     * @async
     */
    this.searches = _.partial(fetchPending, strategies.search);

    function fetchASource(source, strategy) {
      strategy = strategy || strategies[source._getType()];
      var defer = Promise.defer();

      fetchThese([
        {
          strategy: strategy,
          source: source,
          defer: defer
        }
      ], new RequestErrorHandler());

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
     * Fetch a list of pendingRequests
     * @param {string} type - the type name for the sources in the requests
     * @param {array} reqs - the requests to fetch
     */
    this.these = function (reqs) {
      return fetchThese(reqs, new RequestErrorHandler());
    };

    /**
     * Fetch all segmented searches, refetch if needed
     * @async
     */
    this.segmentedSearches = function fetchSegmentedSearches() {
      var strategy = strategies.segmented;
      var requests = strategy.getPendingRequests(pendingRequests);

      if (!requests.length) {
        return Promise.resolve();
      }

      // fetch the current requests, then check for incomplete requests
      // and refetch until those are complete
      return (function fetch(requests) {
        return fetchThese(requests, new RequestErrorHandler())
        .then(function () {
          var incomplete = strategy.getIncompleteRequests(pendingRequests);

          if (_.size(incomplete)) {
            return fetch(incomplete);
          }
        });
      }(requests));
    };
  };
});