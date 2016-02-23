import NotifierProvider from './notifier';
import ForEachStrategyProvider from './for_each_strategy';
import CallClientProvider from './call_client';
import CallResponseHandlersProvider from './call_response_handlers';
import ContinueIncompleteProvider from './continue_incomplete';
import ReqStatusProvider from './req_status';

export default function FetchTheseProvider(Private, Promise) {
  var notify = Private(NotifierProvider);
  var forEachStrategy = Private(ForEachStrategyProvider);

  // core tasks
  var callClient = Private(CallClientProvider);
  var callResponseHandlers = Private(CallResponseHandlersProvider);
  var continueIncomplete = Private(ContinueIncompleteProvider);

  var ABORTED = Private(ReqStatusProvider).ABORTED;
  var DUPLICATE = Private(ReqStatusProvider).DUPLICATE;
  var INCOMPLETE = Private(ReqStatusProvider).INCOMPLETE;

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
