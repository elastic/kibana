import CourierFetchNotifierProvider from './notifier';
import CourierFetchForEachStrategyProvider from './for_each_strategy';
import CourierFetchCallClientProvider from './call_client';
import CourierFetchCallResponseHandlersProvider from './call_response_handlers';
import CourierFetchContinueIncompleteProvider from './continue_incomplete';
import CourierFetchReqStatusProvider from './req_status';

export default function FetchTheseProvider(Private, Promise) {
  var notify = Private(CourierFetchNotifierProvider);
  var forEachStrategy = Private(CourierFetchForEachStrategyProvider);

  // core tasks
  var callClient = Private(CourierFetchCallClientProvider);
  var callResponseHandlers = Private(CourierFetchCallResponseHandlersProvider);
  var continueIncomplete = Private(CourierFetchContinueIncompleteProvider);

  var ABORTED = Private(CourierFetchReqStatusProvider).ABORTED;
  var DUPLICATE = Private(CourierFetchReqStatusProvider).DUPLICATE;
  var INCOMPLETE = Private(CourierFetchReqStatusProvider).INCOMPLETE;

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
      })
      .catch(err => req.handleFailure(err));
    });
  }

  return fetchThese;
};
