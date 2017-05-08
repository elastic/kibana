import { findIndex, isFunction } from 'lodash';

import { IsRequestProvider } from './is_request';
import { MergeDuplicatesRequestProvider } from './merge_duplicate_requests';
import { ReqStatusProvider } from './req_status';
import { CallClientProvider } from './call_client';
import { CallStrategyFetchProvider } from './call_strategy_fetch';

export function SendRequestsProvider(Private, Promise) {
  const isRequest = Private(IsRequestProvider);
  const mergeDuplicateRequests = Private(MergeDuplicatesRequestProvider);
  const { ABORTED, DUPLICATE } = Private(ReqStatusProvider);
  const callStrategyFetch = Private(CallStrategyFetchProvider);
  const callClient = Private(CallClientProvider);

  return function sendRequests(strategy, requests) {
    // merging docs can change status to DUPLICATE, capture new statuses
    const statuses = mergeDuplicateRequests(requests);

    // get the actual list of requests that we will be fetching
    const executable = statuses.filter(isRequest);
    let execCount = executable.length;

    if (!execCount) return Promise.resolve([]);

    // resolved by respond()
    let sendPromise;
    const defer = Promise.defer();

    // for each respond with either the response or ABORTED
    const respond = function (responses) {
      responses = responses || [];
      return Promise.map(requests, function (req, i) {
        switch (statuses[i]) {
          case ABORTED:
            return ABORTED;
          case DUPLICATE:
            return req._uniq.resp;
          default:
            return responses[findIndex(executable, req)];
        }
      })
      .then(
        (res) => defer.resolve(res),
        (err) => defer.reject(err)
      );
    };


    // handle a request being aborted while being fetched
    const requestWasAborted = Promise.method(function (req, i) {
      if (statuses[i] === ABORTED) {
        defer.reject(new Error('Request was aborted twice?'));
      }

      execCount -= 1;
      if (execCount > 0) {
        // the multi-request still contains other requests
        return;
      }

      if (sendPromise && isFunction(sendPromise.abort)) {
        sendPromise.abort();
      }

      sendPromise = ABORTED;

      return respond();
    });


    // attach abort handlers, close over request index
    statuses.forEach(function (req, i) {
      if (!isRequest(req)) return;
      req.whenAborted(function () {
        requestWasAborted(req, i).catch(defer.reject);
      });
    });

    const fetchFn = isFunction(strategy.fetch) ? callStrategyFetch : callClient;
    sendPromise = fetchFn(strategy, requests)
    .then(respond)
    .catch(function (err) {
      if (err === ABORTED) respond();
      else defer.reject(err);
    });

    // return our promise, but catch any errors we create and
    // send them to the requests
    return defer.promise
    .catch(function (err) {
      requests.forEach(function (req, i) {
        if (statuses[i] !== ABORTED) {
          req.handleFailure(err);
        }
      });
    });

    // return our promise, but catch any errors we create and
    // send them to the requests
    return defer.promise
    .catch(function (err) {
      requests.forEach(function (req, i) {
        if (statuses[i] !== ABORTED) {
          req.handleFailure(err);
        }
      });
    });
  };
}
