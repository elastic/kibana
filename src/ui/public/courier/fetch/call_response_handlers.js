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

import { RequestFailure, SearchTimeout, ShardFailure } from '../../errors';

import { RequestStatus } from './req_status';
import { courierNotifier } from './notifier';

export function CallResponseHandlersProvider(Private, Promise) {
  const ABORTED = RequestStatus.ABORTED;
  const INCOMPLETE = RequestStatus.INCOMPLETE;

  function callResponseHandlers(requests, responses) {
    return Promise.map(requests, function (req, i) {
      if (req === ABORTED || req.aborted) {
        return ABORTED;
      }

      const resp = responses[i];

      if (resp.timed_out) {
        courierNotifier.warning(new SearchTimeout());
      }

      if (resp._shards && resp._shards.failed) {
        courierNotifier.warning(new ShardFailure(resp));
      }

      function progress() {
        if (req.isIncomplete()) {
          return INCOMPLETE;
        }

        req.complete();
        return resp;
      }

      if (resp.error) {
        if (req.filterError(resp)) {
          return progress();
        } else {
          return req.handleFailure(new RequestFailure(null, resp));
        }
      }

      return Promise.try(() => req.handleResponse(resp)).then(progress);
    });
  }

  return callResponseHandlers;
}
