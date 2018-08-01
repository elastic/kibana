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

import { EventsProvider } from '../../../../events';

export function SegmentedHandleProvider(Private) {
  const Events = Private(EventsProvider);

  const segmentedRequest = Symbol('Actual Segmented Request');

  /**
   * Simple class for creating an object to send to the
   * requester of a SegmentedSearchRequest. Since the SegmentedSearchRequest
   * extends AbstractRequest, it wasn't able to be the event
   * emitter it was born to be. This provides a channel for
   * setting values on the segmented request, and an event
   * emitter for the request to speak outwardly
   *
   * @param {SegmentedSearchRequest} - req - the request this handle relates to
   */
  return class SegmentedHandle extends Events {
    constructor(req) {
      super();
      this[segmentedRequest] = req;
    }

    setDirection(...args) {
      this[segmentedRequest].setDirection(...args);
    }

    setSize(...args) {
      this[segmentedRequest].setSize(...args);
    }

    setMaxSegments(...args) {
      this[segmentedRequest].setMaxSegments(...args);
    }

    setSortFn(...args) {
      this[segmentedRequest].setSortFn(...args);
    }
  };
}
