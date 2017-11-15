import _ from 'lodash';

import { ErrorAllowExplicitIndexProvider } from 'ui/error_allow_explicit_index';
import { IsRequestProvider } from './is_request';
import { MergeDuplicatesRequestProvider } from './merge_duplicate_requests';
import { RequestStatus } from './req_status';
import { RequestFetchParamsToBodyProvider } from './request/request_fetch_params_to_body_provider';

export function CallClientProvider(Private, Promise, es) {
  const errorAllowExplicitIndex = Private(ErrorAllowExplicitIndexProvider);
  const isRequest = Private(IsRequestProvider);
  const mergeDuplicateRequests = Private(MergeDuplicatesRequestProvider);
  const requestFetchParamsToBody = Private(RequestFetchParamsToBodyProvider);

  const ABORTED = RequestStatus.ABORTED;
  const DUPLICATE = RequestStatus.DUPLICATE;

  function callClient(requests) {
    // merging docs can change status to DUPLICATE, capture new statuses
    const statuses = mergeDuplicateRequests(requests);

    // get the actual list of requests that we will be fetching
    let requestsToFetch = statuses.filter(isRequest);
    let execCount = requestsToFetch.length;

    if (!execCount) return Promise.resolve([]);

    // resolved by respond()
    let esPromise;
    const defer = Promise.defer();

    // for each respond with either the response or ABORTED
    const respond = function (responses) {
      responses = responses || [];
      return Promise.map(requests, function (request, i) {
        switch (statuses[i]) {
          case ABORTED:
            return ABORTED;
          case DUPLICATE:
            return request._uniq.resp;
          default:
            const index = _.findIndex(requestsToFetch, request);
            if (index < 0) {
              // This means the request failed.
              return ABORTED;
            }
            return responses[index];
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

      if (esPromise && _.isFunction(esPromise.abort)) {
        esPromise.abort();
      }

      esPromise = ABORTED;

      return respond();
    });


    // attach abort handlers, close over request index
    statuses.forEach(function (req, i) {
      if (!isRequest(req)) return;
      req.whenAborted(function () {
        requestWasAborted(req, i).catch(defer.reject);
      });
    });

    // Now that all of THAT^^^ is out of the way, lets actually
    // call out to elasticsearch
    Promise.map(requestsToFetch, function (request) {
      return Promise.try(request.getFetchParams, void 0, request)
        .then(function (fetchParams) {
          return (request.fetchParams = fetchParams);
        })
        .then(value => ({ resolved: value }))
        .catch(error => ({ rejected: error }));
    })
      .then(function (results) {
        const requestsWithFetchParams = [];
        // Gather the fetch param responses from all the successful requests.
        results.forEach((result, index) => {
          if (result.resolved) {
            requestsWithFetchParams.push(result.resolved);
          } else {
            const request = requestsToFetch[index];
            request.handleFailure(result.rejected);
            requestsToFetch[index] = undefined;
          }
        });
        // The index of the request inside requestsToFetch determines which response is mapped to it. If a request
        // won't generate a response, since it already failed, we need to remove the request
        // from the requestsToFetch array so the indexes will continue to match up to the responses correctly.
        requestsToFetch = requestsToFetch.filter(request => request !== undefined);
        return requestFetchParamsToBody(requestsWithFetchParams);
      })
      .then(function (body) {
      // while the strategy was converting, our request was aborted
        if (esPromise === ABORTED) {
          throw ABORTED;
        }

        return (esPromise = es.msearch({ body }));
      })
      .then((clientResponse => respond(clientResponse.responses)))
      .catch(function (error) {
        if (errorAllowExplicitIndex.test(error)) {
          return errorAllowExplicitIndex.takeover();
        }

        if (error === ABORTED) respond();
        else defer.reject(error);
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

  }

  return callClient;
}
