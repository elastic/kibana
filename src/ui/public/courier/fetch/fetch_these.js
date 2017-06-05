import { CourierNotifierProvider } from './notifier';
import { ForEachStrategyProvider } from './for_each_strategy';
import { CallClientProvider } from './call_client';
import { CallResponseHandlersProvider } from './call_response_handlers';
import { ContinueIncompleteProvider } from './continue_incomplete';
import { ReqStatusProvider } from './req_status';

export function FetchTheseProvider(Private, Promise) {
  const notify = Private(CourierNotifierProvider);
  const forEachStrategy = Private(ForEachStrategyProvider);

  // core tasks
  const callClient = Private(CallClientProvider);
  const callResponseHandlers = Private(CallResponseHandlersProvider);
  const continueIncomplete = Private(ContinueIncompleteProvider);

  const ABORTED = Private(ReqStatusProvider).ABORTED;
  const DUPLICATE = Private(ReqStatusProvider).DUPLICATE;
  const INCOMPLETE = Private(ReqStatusProvider).INCOMPLETE;

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
        const action = req.started ? req.continue : req.start;
        resolve(action.call(req));
      })
      .catch(err => req.handleFailure(err));
    });
  }

  return fetchThese;
}
