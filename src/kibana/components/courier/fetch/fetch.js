define(function (require) {

  var module = require('modules').get('kibana/courier');
  var _ = require('lodash');

  var docStrategy = require('./strategy/doc');
  var searchStrategy = require('./strategy/search');

  module.service('couriersFetch', function (es, Promise, couriersErrors, createNotifier, $q) {
    var notify = createNotifier({
      location: 'Courier Fetch'
    });

    function RequestErrorHandler(courier) { this._courier = courier; }
    RequestErrorHandler.prototype.handle = function (req, error) {
      if (!this._courier) return req.defer.reject(error);
      this._courier._pendingRequests.push(req);
      var handlerCount = 0;
      this._courier._errorHandlers.splice(0).forEach(function (handler) {
        if (handler.source !== req.source) return this._courier._pendingRequests.push(handler);
        handler.defer.resolve(error);
        handlerCount++;
      });
      if (!handlerCount) {
        notify.fatal(new Error('unhandled error ' + (error.stack || error.message)));
        this._courier.stop();
      }
    };

    var fetchThese = function (strategy, requests, reqErrHandler) {
      var all, body;

      all = requests.splice(0);

      return Promise.map(all, function (req) {
        return req.source._flatten();
      })
      .then(function (reqs) {
        body = strategy.requestStatesToBody(reqs);

        return es[strategy.clientMethod]({
          body: body
        })
        .then(function (resp) {
          strategy.getResponses(resp).forEach(function (resp) {
            var req = all.shift();
            if (resp.error) return reqErrHandler.handle(req, new couriersErrors.FetchFailure(resp));
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

    var fetchPending = function (strategy, courier) {
      var requests = strategy.getPendingRequests(courier._pendingRequests);
      if (!requests.length) return Promise.resolved();
      else return fetchThese(strategy, requests, new RequestErrorHandler(courier));
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
  });
});