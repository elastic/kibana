define(function (require) {
  return function fetchService(Private, es, Promise, Notifier) {
    var _ = require('lodash');
    var errors = require('errors');

    var docStrategy = Private(require('./strategy/doc'));
    var searchStrategy = Private(require('./strategy/search'));

    var RequestErrorHandler = Private(require('./_request_error_handler'));
    var pendingRequests = Private(require('../_pending_requests'));

    var notify = new Notifier({
      location: 'Courier Fetch'
    });

    var fetchThese = function (strategy, requests, reqErrHandler) {
      var all, body;

      // dedupe requests
      var uniqs = {};
      all = requests.splice(0).filter(function (req) {
        var iid = req.source._instanceid;
        if (!uniqs[iid]) {
          // this request is unique so far
          uniqs[iid] = req;
          // keep the request
          return true;
        }

        // the source was requested at least twice
        var uniq = uniqs[iid];
        if (uniq._merged) {
          // already setup the multi-responder
          uniq._merged.push(req);
        } else {
          // put all requests into this array and itterate them all
          uniq._merged = [uniq, req];
        }
      });

      return Promise.map(all, function (req) {
        return req.source._flatten();
      })
      .then(function (reqs) {
        // all requests must have been disabled
        if (!reqs.length) return Promise.resolve();

        body = strategy.requestStatesToBody(reqs);

        return es[strategy.clientMethod]({
          body: body
        })
        .then(function (resp) {
          var sendResponse = function (req, resp) {
            if (resp.error) return reqErrHandler.handle(req, new errors.FetchFailure(resp));
            else strategy.resolveRequest(req, resp);
          };

          strategy.getResponses(resp).forEach(function (resp) {
            var req = all.shift();
            if (!req._merged) sendResponse(req, resp);
            else {
              req._merged.forEach(function (mergedReq) {
                sendResponse(mergedReq, _.cloneDeep(resp));
              });
            }
          });

          // pass the response along to the next promise
          return resp;
        })
        .catch(function (err) {
          var sendFailure = function (req) {
            reqErrHandler.handle(req, err);
          };

          all.forEach(function (req) {
            if (!req._merged) sendFailure(req);
            else req._merged.forEach(sendFailure);
          });
          throw err;
        });
      }, notify.fatal);
    };

    var fetchPending = function (strategy) {
      var requests = strategy.getPendingRequests(pendingRequests);
      if (!requests.length) return Promise.resolve();
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