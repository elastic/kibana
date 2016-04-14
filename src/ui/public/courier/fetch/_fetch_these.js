define(function (require) {
  return function FetchTheseProvider(Private, Promise) {
    let notify = Private(require('ui/courier/fetch/_notifier'));
    let forEachStrategy = Private(require('ui/courier/fetch/_for_each_strategy'));

    // core tasks
    let callClient = Private(require('ui/courier/fetch/_call_client'));
    let callResponseHandlers = Private(require('ui/courier/fetch/_call_response_handlers'));
    let continueIncomplete = Private(require('ui/courier/fetch/_continue_incomplete'));

    let ABORTED = Private(require('ui/courier/fetch/_req_status')).ABORTED;
    let DUPLICATE = Private(require('ui/courier/fetch/_req_status')).DUPLICATE;
    let INCOMPLETE = Private(require('ui/courier/fetch/_req_status')).INCOMPLETE;

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
      function replaceAbortedRequests() {
        requests = requests.map(r => r.aborted ? ABORTED : r);
      }

      replaceAbortedRequests();
      return startRequests(requests)
      .then(function () {
        replaceAbortedRequests();
        return callClient(strategy, requests);
      })
      .then(function (responses) {
        replaceAbortedRequests();
        return callResponseHandlers(requests, responses);
      })
      .then(function (responses) {
        replaceAbortedRequests();
        return continueIncomplete(strategy, requests, responses, fetchWithStrategy);
      })
      .then(function (responses) {
        replaceAbortedRequests();
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
          let action = req.started ? req.continue : req.start;
          resolve(action.call(req));
        })
        .catch(err => req.handleFailure(err));
      });
    }

    return fetchThese;
  };
});
