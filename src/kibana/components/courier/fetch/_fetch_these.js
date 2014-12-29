define(function (require) {
  return function FetchTheseProvider(Private, Promise) {
    var notify = Private(require('components/courier/fetch/_notifier'));
    var forEachStrategy = Private(require('components/courier/fetch/_for_each_strategy'));

    // core tasks
    var callClient = Private(require('components/courier/fetch/_call_client'));
    var callResponseHandlers = Private(require('components/courier/fetch/_call_response_handlers'));
    var continueIncomplete = Private(require('components/courier/fetch/_continue_incomplete'));

    var ABORTED = Private(require('components/courier/fetch/_req_status')).ABORTED;
    var DUPLICATE = Private(require('components/courier/fetch/_req_status')).DUPLICATE;
    var INCOMPLETE = Private(require('components/courier/fetch/_req_status')).INCOMPLETE;

    function fetchThese(requests) {
      return forEachStrategy(requests, function (strategy, requests) {
        return fetchWithStrategy(strategy, requests.map(function (req) {
          if (!req.started) return req;
          return req.retry();
        }));
      })
      .catch(notify.fatal);
    }

    function fetchWithStrategy(strategy, requests) {

      requests = requests.map(function (req) {
        if (req.aborted) {
          return ABORTED;
        }

        if (req.started) {
          req.continue();
        } else {
          req.start();
        }

        return req;
      });

      return Promise.resolve()
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

    return fetchThese;
  };
});