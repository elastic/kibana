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

import { IsRequestProvider } from './is_request';
import { RequestStatus } from './req_status';

export function MergeDuplicatesRequestProvider(Private) {
  const isRequest = Private(IsRequestProvider);
  const DUPLICATE = RequestStatus.DUPLICATE;

  function mergeDuplicateRequests(requests) {
    // dedupe requests
    const index = {};
    return requests.map(function (req) {
      if (!isRequest(req)) return req;

      const searchSourceId = req.source.getId();
      if (!index[searchSourceId]) {
        // this request is unique so far
        index[searchSourceId] = req;
        // keep the request
        return req;
      }

      // the source was requested at least twice
      req._uniq = index[searchSourceId];
      return DUPLICATE;
    });
  }

  return mergeDuplicateRequests;
}
