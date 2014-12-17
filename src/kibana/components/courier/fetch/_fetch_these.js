define(function (require) {
  return function FetchTheseProvider(Private, Promise, es, Notifier, sessionId, configFile) {
    var _ = require('lodash');

    var initRequest = Private(require('components/courier/fetch/_init_request'));
    var reqComplete = Private(require('components/courier/fetch/_request_complete'));
    var forEachStrategy = Private(require('components/courier/fetch/_for_each_strategy'));
    var requestErrorHandler = Private(require('components/courier/fetch/_request_error_handler'));
    var mergeDuplicateRequests = Private(require('components/courier/fetch/_merge_duplicate_requests'));


    function fetchThese(requests) {
      return forEachStrategy(requests, function (requests, strategy) {
        requests.forEach(initRequest);

        var uniq = mergeDuplicateRequests(requests);
        var states;
        var responses;

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
                var respClone = _.cloneDeep(resp);
                return reqComplete(mergedReq, respClone);
              }));
            }
          }));
        })
        .then(function () {
          return responses;
        })
        .catch(function (err) {
          function sendFailure(req) {
            req.source.activeFetchCount -= 1;
            requestErrorHandler(req, err);
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