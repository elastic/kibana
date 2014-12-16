define(function (require) {
  return function FetchTheseProvider(Private, Promise, es, Notifier, sessionId, configFile) {
    var _ = require('lodash');
    var moment = require('moment');
    var errors = require('errors');
    var pendingRequests = Private(require('components/courier/_pending_requests'));

    var notify = new Notifier({
      location: 'Courier Fetch'
    });

    function eachStrategy(requests, block) {
      block = Promise.method(block);
      var sets = [];

      requests.forEach(function (req) {
        var strategy = req.strategy;
        var set = _.find(sets, { 0: strategy });
        if (set) set[1].push(req);
        else sets.push([strategy, [req]]);
      });

      return Promise.all(sets.map(function (set) {
        return (function fetch(requests, strategy) {
          return block(requests, strategy)
          .then(function checkForIncompleteRequests(result) {
            if (_.isFunction(strategy.getIncompleteRequests)) {
              var incomplete = strategy.getIncompleteRequests(pendingRequests);
              if (incomplete.length) {
                return fetch(incomplete, strategy);
              }
            }
            return result;
          });
        }(set[1], set[0]));
      }))
      .catch(notify.fatal);
    }

    function initRequest(req) {
      if (req.source.activeFetchCount) {
        req.source.activeFetchCount += 1;
      } else {
        req.source.activeFetchCount = 1;
      }

      req.moment = moment();
    }

    function mergeDuplicateRequests(requests) {
      // dedupe requests
      var index = {};
      return requests.splice(0).filter(function (req) {
        var iid = req.source._instanceid;
        if (!index[iid]) {
          // this request is unique so far
          index[iid] = req;
          // keep the request
          return true;
        }

        // the source was requested at least twice
        var uniq = index[iid];
        if (uniq._merged) {
          // already setup the merged list
          uniq._merged.push(req);
        } else {
          // put all requests into this array and itterate them on response
          uniq._merged = [uniq, req];
        }
      });
    }

    function reqComplete(req, resp, errorHandler) {
      if (resp.timed_out) {
        notify.warning(new errors.SearchTimeout());
      }

      req.complete = true;
      req.resp = resp;
      req.ms = req.moment.diff() * -1;
      req.source.activeFetchCount -= 1;

      if (resp.error) {
        return errorHandler.handle(req, new errors.FetchFailure(resp));
      }

      req.strategy.resolveRequest(req, resp);
    }

    function fetchThese(requests, errorHandler) {
      return eachStrategy(requests, function (requests, strategy) {
        requests.forEach(initRequest);

        var uniq = mergeDuplicateRequests(requests);
        var states;

        return Promise.map(uniq, function (req) {
          return strategy.getSourceStateFromRequest(req);
        })
        .then(function (_states_) {
          states = _states_;

          // all requests must have been disabled
          if (!states.length) return Promise.resolve(false);

          return es[strategy.clientMethod]({
            timeout: configFile.shard_timeout,
            preference: sessionId,
            body: strategy.convertStatesToBody(states)
          });
        })
        .then(strategy.getResponses)
        .then(function (responses) {

          responses.forEach(function (resp) {
            var req = uniq.shift();
            var state = states.shift();
            if (!req._merged) {
              req.state = state;
              reqComplete(req, resp, errorHandler);
            } else {
              req._merged.forEach(function (mergedReq) {
                mergedReq.state = state;
                var respClone = _.cloneDeep(resp);
                reqComplete(mergedReq, respClone, errorHandler);
              });
            }
          });

          return responses;
        })
        .catch(function (err) {

          function sendFailure(req) {
            req.source.activeFetchCount -= 1;
            errorHandler.handle(req, err);
          }

          uniq.forEach(function (req) {
            if (!req._merged) sendFailure(req);
            else req._merged.forEach(sendFailure);
          });
          throw err;
        });
      });
    }

    return fetchThese;
  };
});