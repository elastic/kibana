define(function (require) {
  return function fetchService(Private, es, Promise, Notifier, $q) {
    var _ = require('lodash');

    var docStrategy = require('./strategy/doc');
    var searchStrategy = require('./strategy/search');

    var errors = Private(require('../_errors'));
    var RequestErrorHandler = Private(require('./_request_error_handler'));
    var pendingRequests = Private(require('../_pending_requests'));

    var notify = new Notifier({
      location: 'Courier Fetch'
    });

    var fetchThese = function (strategy, requests, reqErrHandler) {
      var all, body;

      all = requests.splice(0);

      return Promise.map(all, function (req) {
        return req.source._flatten();
      })
      .then(function (reqs) {
        // all requests must have been disabled
        if (!reqs.length) return Promise.resolved();

        body = strategy.requestStatesToBody(reqs);

        return es[strategy.clientMethod]({
          body: body
        })
        .then(function (resp) {
          strategy.getResponses(resp).forEach(function (resp) {
            var req = all.shift();
            if (resp.error) return reqErrHandler.handle(req, new errors.FetchFailure(resp));
            else strategy.resolveRequest(req, resp);
          });

          // pass the response along to the next promise
          return resp;
        })
        .catch(function (err) {
          all.forEach(function (req) {
            reqErrHandler.handle(req, err);
          });
          throw err;
        });
      }, notify.fatal);
    };

    var fetchPending = function (strategy) {
      var requests = strategy.getPendingRequests(pendingRequests);
      if (!requests.length) return Promise.resolved();
      else return fetchThese(strategy, requests, new RequestErrorHandler());
    };

    var fetchASource = function (strategy, source) {
      var defer = Promise.defer();
      fetchThese(strategy, [
        {
          source: source,
          defer: defer
        }
      ], new RequestErrorHandler());
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
  };
});