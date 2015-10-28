define(function (require) {
  return function FetchTheseProvider(Private, Promise) {
    var notify = Private(require('ui/courier/fetch/_notifier'));
    var forEachStrategy = Private(require('ui/courier/fetch/_for_each_strategy'));

    // core tasks
    var callClient = Private(require('ui/courier/fetch/_call_client'));
    var callResponseHandlers = Private(require('ui/courier/fetch/_call_response_handlers'));
    var continueIncomplete = Private(require('ui/courier/fetch/_continue_incomplete'));

    var ABORTED = Private(require('ui/courier/fetch/_req_status')).ABORTED;
    var DUPLICATE = Private(require('ui/courier/fetch/_req_status')).DUPLICATE;
    var INCOMPLETE = Private(require('ui/courier/fetch/_req_status')).INCOMPLETE;

    function fetchThese(requests) {
      return forEachStrategy(requests, function (strategy, reqsForStrategy) {
        return fetchWithStrategy(strategy, reqsForStrategy.map(function (req) {
          if (!req.started) return req;
          return req.retry();
        }));
      })
      .catch(notify.fatal);
    }

    function fetchWithStrategy(strategy, requests) {

      requests = requests.map(function (req) {
        return req.aborted ? ABORTED : req;
      });

      return startRequests(requests)
      .then(function () {
        return callClient(strategy, requests);
      })
      .then(function (responses) {
        return callResponseHandlers(requests, responses);
      })
      .then(function (responses) {
        return continueIncomplete(strategy, requests, responses, fetchWithStrategy);
      })
      .then(function (responses) {
        return responses.map(function (resp) {
          switch (resp) {
            case ABORTED:
              return null;
            case DUPLICATE:
            case INCOMPLETE:
              throw new Error('Failed to clear incomplete or duplicate request from responses.');
            default:
              return resp;
          }
        });
      });
    }

    function startRequests(requests) {
      return Promise.map(requests, function (req) {
        if (req === ABORTED) {
          return req;
        }

        return new Promise(function (resolve) {
          var action = req.started ? req.continue : req.start;
          resolve(action.call(req));
        });
      });
    }

    return fetchThese;
  };
});
