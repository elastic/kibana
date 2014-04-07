define(function (require) {

  var module = require('modules').get('courier/fetch');
  var _ = require('lodash');

  var docStrategy = require('./strategy/doc');
  var searchStrategy = require('./strategy/search');

  module.service('couriersFetch', function (es, Promise, couriersErrors) {

    var flattenRequest = function (req) {
      return req.source._flatten();
    };

    var fetchThese = function (strategy, requests) {
      var all = requests.splice(0);
      return es[strategy.clientMethod]({
        body: strategy.requestStatesToBody(all.map(flattenRequest))
      })
      .then(function (resp) {
        strategy.getResponses(resp).forEach(function (resp) {
          var req = all.shift();
          if (resp.error) return req.defer.reject(new couriersErrors.FetchFailure(resp));
          else strategy.resolveRequest(req, resp);
        });

        // pass the response along to the next promise
        return resp;
      })
      .catch(function (err) {
        all.forEach(function (req) {
          req.defer.reject(err);
        });
        throw err;
      });
    };

    var fetchPending = function (strategy, courier) {
      var requests = strategy.getPendingRequests(courier._pendingRequests);
      if (!requests.length) return Promise.resolved();
      else return fetchThese(strategy, requests);
    };

    var fetchASource = function (strategy, source) {
      var defer = Promise.defer();
      fetchThese(strategy, [
        {
          source: source,
          defer: defer
        }
      ]);
      return defer.promise;
    };

    /**
     * Fetch all pending docs that are ready to be fetched
     * @param {Courier} courier - The courier to read the pending
     *                          requests from
     * @async
     */
    this.docs = _.partial(fetchPending, docStrategy);

    /**
     * Fetch all pending search requests
     * @param {Courier} courier - The courier to read the pending
     *                          requests from
     * @async
     */
    this.searches = _.partial(fetchPending, searchStrategy);

    /**
     * Fetch a single doc source
     * @param {DocSource} source - The DocSource to request
     * @async
     */
    this.doc = _.partial(fetchASource, docStrategy);

    /**
     * Fetch a single search source
     * @param {SearchSource} source - The SearchSource to request
     * @async
     */
    this.search = _.partial(fetchASource, searchStrategy);
  });
});