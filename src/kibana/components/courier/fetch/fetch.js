define(function (require) {
  return function fetchService(Private, es, Promise, Notifier, sessionId, configFile) {
    var _ = require('lodash');
    var errors = require('errors');
    var moment = require('moment');

    var docStrategy = Private(require('components/courier/fetch/strategy/doc'));
    var searchStrategy = Private(require('components/courier/fetch/strategy/search'));
    var strategies = this.strategies = {
      doc: docStrategy,
      search: searchStrategy
    };

    var RequestErrorHandler = Private(require('components/courier/fetch/_request_error_handler'));
    var pendingRequests = Private(require('components/courier/_pending_requests'));

    var notify = new Notifier({
      location: 'Courier Fetch'
    });

    var fetchThese = function (strategy, requests, reqErrHandler) {
      var all, body;

      // dedupe requests
      var uniqs = {};
      all = requests.splice(0).filter(function (req) {
        if (req.source.activeFetchCount) {
          req.source.activeFetchCount += 1;
        } else {
          req.source.activeFetchCount = 1;
        }

        req.moment = moment();

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
          // already setup the merged list
          uniq._merged.push(req);
        } else {
          // put all requests into this array and itterate them on response
          uniq._merged = [uniq, req];
        }
      });

      return Promise.map(all, _.limit(strategy.getSourceStateFromRequest, 1))
      .then(function (states) {
        // all requests must have been disabled
        if (!states.length) return Promise.resolve();

        body = strategy.convertStatesToBody(states);

        return es[strategy.clientMethod]({
          timeout: configFile.shard_timeout,
          preference: sessionId,
          body: body
        })
        .then(function (resp) {
          var sendResponse = function (req, resp) {
            if (resp.timed_out) {
              notify.warning(new errors.SearchTimeout());
            }
            req.complete = true;
            req.resp = resp;
            req.ms = req.moment.diff() * -1;
            req.source.activeFetchCount -= 1;

            if (resp.error) return reqErrHandler.handle(req, new errors.FetchFailure(resp));
            else strategy.resolveRequest(req, resp);
          };

          strategy.getResponses(resp).forEach(function (resp) {
            var req = all.shift();
            var state = states.shift();
            if (!req._merged) {
              req.state = state;
              sendResponse(req, resp);
            } else {
              req._merged.forEach(function (mergedReq) {
                mergedReq.state = state;
                sendResponse(mergedReq, _.cloneDeep(resp));
              });
            }
          });

          // pass the response along to the next promise
          return resp;
        })
        .catch(function (err) {
          var sendFailure = function (req) {
            req.source.activeFetchCount -= 1;
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

    /**
     * Fetch a list of pendingRequests, which is already filtered
     * @param {string} type - the type name for the sources in the requests
     * @param {array} reqs - the requests to fetch
     */
    this.these = function (type, reqs) {
      return fetchThese(
        strategies[type],
        reqs,
        new RequestErrorHandler()
      );
    };
  };
});