define(function (require) {
  return function FetchTheseProvider(Private, Promise, es, Notifier, sessionId, configFile) {
    var _ = require('lodash');
    var moment = require('moment');
    var errors = require('errors');
    var pendingRequests = Private(require('components/courier/_pending_requests'));

    var notify = new Notifier({
      location: 'Courier Fetch'
    });

    function perStrategy(requests, each) {
      each = Promise.method(each);
      var sets = [];

      requests.forEach(function (req) {
        var strategy = req.strategy || req.source._fetchStrategy;
        var set = _.find(sets, { 0: strategy });
        if (set) set[1].push(req);
        else sets.push([strategy, [req]]);
      });

      return Promise.all(sets.map(function (set) {
        (function fetch(requests, strategy) {
          return each(requests, strategy)
          .then(function (result) {
            if (_.isFunction(strategy.getIncompleteRequests)) {
              var incomplete = strategy.getIncompleteRequests(pendingRequests);
              if (incomplete.length) {
                return fetch(incomplete, strategy);
              }
            }
          });
        }(set[1], set[0]));
      }));
    }

    function fetchThese(requests, reqErrHandler) {
      return perStrategy(requests, function (requests, strategy) {
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
      });
    }

    return fetchThese;
  };
});