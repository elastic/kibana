/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';

import { ErrorAllowExplicitIndexProvider } from '../../error_allow_explicit_index';
import { RequestStatus } from './req_status';
import { SerializeFetchParamsProvider } from './request/serialize_fetch_params';

export function CallClientProvider(Private, Promise, es) {
  const errorAllowExplicitIndex = Private(ErrorAllowExplicitIndexProvider);
  const serializeFetchParams = Private(SerializeFetchParamsProvider);

  const ABORTED = RequestStatus.ABORTED;

  function callClient(request) {
    // resolved by respond()
    let esPromise = undefined;
    let isRequestAborted = false;
    const defer = Promise.defer();

    // for each respond with either the response or ABORTED
    const respond = function (responses) {
      responses = responses || [];
      defer.resolve(responses[0]);
    };

    // handle a request being aborted while being fetched
    const requestWasAborted = Promise.method(function () {
      if (esPromise && _.isFunction(esPromise.abort)) {
        esPromise.abort();
      }

      esPromise = undefined;
      isRequestAborted = true;

      return respond();
    });

    request.whenAborted(function () {
      requestWasAborted(request).catch(defer.reject);
    });

    // We're going to create a new async context here, so that the logic within it can execute
    // asynchronously after we've returned a reference to defer.promise.
    Promise.resolve().then(async () => {
      // Flatten the searchSource within each searchRequest to get the fetch params,
      // e.g. body, filters, index pattern, query.
      const allFetchParams = await getAllFetchParams([request]);

      // Serialize the fetch params into a format suitable for the body of an ES query.
      const serializedFetchParams = await serializeAllFetchParams(allFetchParams, [request]);

      try {
        // The request was aborted while we were doing the above logic.
        if (isRequestAborted) {
          throw ABORTED;
        }

        esPromise = es.msearch({ body: serializedFetchParams });
        const clientResponse = await esPromise;
        await respond(clientResponse.responses);
      } catch(error) {
        if (error === ABORTED) {
          return await respond();
        }

        if (errorAllowExplicitIndex.test(error)) {
          return errorAllowExplicitIndex.takeover();
        }

        defer.reject(error);
      }
    });

    // return our promise, but catch any errors we create and
    // send them to the requests
    return defer.promise
      .catch((err) => {
        request.handleFailure(err);
      });
  }

  function getAllFetchParams(requests) {
    return Promise.map(requests, (request) => {
      return Promise.try(request.getFetchParams, void 0, request)
        .then((fetchParams) => {
          return (request.fetchParams = fetchParams);
        })
        .then(value => ({ resolved: value }))
        .catch(error => ({ rejected: error }));
    });
  }

  function serializeAllFetchParams(fetchParams, requestsToFetch) {
    const requestsWithFetchParams = [];

    // Gather the fetch param responses from all the successful requests.
    fetchParams.forEach((result, index) => {
      if (result.resolved) {
        requestsWithFetchParams.push(result.resolved);
      } else {
        const request = requestsToFetch[index];
        request.handleFailure(result.rejected);
        requestsToFetch[index] = undefined;
      }
    });
    return serializeFetchParams(requestsWithFetchParams);
  }

  return callClient;
}
