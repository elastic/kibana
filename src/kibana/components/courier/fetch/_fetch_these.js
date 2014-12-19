define(function (require) {
  return function FetchTheseProvider(Private, Promise, es, sessionId, configFile) {
    var _ = require('lodash');

    var errors = require('errors');
    var Notifier = require('components/notify/_notifier');
    var requestQueue = Private(require('components/courier/_request_queue'));
    var forEachStrategy = Private(require('components/courier/fetch/_for_each_strategy'));
    var mergeDuplicateRequests = Private(require('components/courier/fetch/_merge_duplicate_requests'));

    var notify = new Notifier({
      location: 'Courier Fetch'
    });

    function fetchThese(requests) {
      return forEachStrategy(requests, function fetchRequestsWithStrategy(requests, strategy) {
        return executeFetch(requests, strategy)
        .then(function checkForIncompleteRequests(result) {
          var incomplete = requestQueue.getIncomplete(strategy);
          if (incomplete.length) {
            return fetchRequestsWithStrategy(incomplete, strategy);
          }

          return result;
        });
      })
      .catch(notify.fatal);
    }

    function reqComplete(req, resp) {
      if (resp.timed_out) {
        notify.warning(new errors.SearchTimeout());
      }

      if (req.canceled) return;
      return req[resp.error ? 'reject' : 'resolve'](resp);
    }

    function startAndRestart(requests) {
      var started = [];

      requests.forEach(function (req) {
        if (req.canceled) {
          return;
        }

        if (req.started) {
          req = req.restart();
        } else {
          req.start();
        }

        started.push(req);
      });

      return started;
    }

    function executeFetch(requests, strategy) {
      var uniq = mergeDuplicateRequests(startAndRestart(requests));
      var states;
      var responses;

      return Promise
      .map(uniq, strategy.getSourceStateFromRequest)
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
      .then(function (_responses_) {
        responses = _responses_;

        return Promise.all(responses.map(function (resp) {
          var req = uniq.shift();
          var state = states.shift();

          if (!req._merged) {
            req.state = state;
            return reqComplete(req, resp);
          } else {
            return Promise.all(req._merged.map(function (mergedReq) {
              mergedReq.state = state;
              return reqComplete(mergedReq, _.cloneDeep(resp));
            }));
          }
        }));
      })
      .then(function () {
        return responses;
      })
      .catch(function (err) {
        function sendFailure(req) {
          req.reject(err);
        }

        uniq.forEach(function (req) {
          if (!req._merged) sendFailure(req);
          else req._merged.forEach(sendFailure);
        });

        throw err;
      });
    }

    return fetchThese;
  };
});