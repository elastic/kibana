define(function (require) {
  return function fetchService(Private, Promise) {
    var _ = require('lodash');

    var strategies = this.strategies = {
      doc: Private(require('components/courier/fetch/strategy/doc')),
      search: Private(require('components/courier/fetch/strategy/search'))
    };

    var requestQueue = Private(require('components/courier/_request_queue'));
    var fetchThese = Private(require('components/courier/fetch/_fetch_these'));

    function fetchPending(strategy) {
      var requests = requestQueue.getPending(strategy);
      if (!requests.length) return Promise.resolve();
      else return fetchThese(requests);
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
     * @param {string} type - the type name for the sources in the requests
     * @param {array} reqs - the requests to fetch
     */
    this.these = fetchThese;
  };
});