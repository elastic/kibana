import { fatalError } from '../../notify';
import { CallClientProvider } from './call_client';
import { CallResponseHandlersProvider } from './call_response_handlers';
import { ContinueIncompleteProvider } from './continue_incomplete';
import { RequestStatus } from './req_status';
import { location } from './notifier';

/**
 * Fetch now provider should be used if you want the results searched and returned immediately.
 * This can be slightly inefficient if a large number of requests are queued up, we can batch these
 * by using fetchSoon. This introduces a slight delay which allows other requests to queue up before
 * sending out requests in a batch.
 *
 * @param Private
 * @param Promise
 * @return {fetchNow}
 * @constructor
 */
export function FetchNowProvider(Private, Promise) {
  // core tasks
  const callClient = Private(CallClientProvider);
  const callResponseHandlers = Private(CallResponseHandlersProvider);
  const continueIncomplete = Private(ContinueIncompleteProvider);

  const ABORTED = RequestStatus.ABORTED;
  const DUPLICATE = RequestStatus.DUPLICATE;
  const INCOMPLETE = RequestStatus.INCOMPLETE;

  function fetchNow(requests) {
    return fetchSearchResults(requests.map(function (req) {
      if (!req.started) return req;
      return req.retry();
    }))
      .catch(error => fatalError(error, location));
  }

  function fetchSearchResults(requests) {
    function replaceAbortedRequests() {
      requests = requests.map(r => r.aborted ? ABORTED : r);
    }

    replaceAbortedRequests();
    return startRequests(requests)
      .then(function () {
        replaceAbortedRequests();
        return callClient(requests);
      })
      .then(function (responses) {
        replaceAbortedRequests();
        return callResponseHandlers(requests, responses);
      })
      .then(function (responses) {
        replaceAbortedRequests();
        return continueIncomplete(requests, responses, fetchSearchResults);
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

  return fetchNow;
}
