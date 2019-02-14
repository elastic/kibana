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

import { defaultSearchStrategy } from './default_search_strategy';
import { Promise } from 'bluebird';

const { search } = defaultSearchStrategy;

describe('defaultSearchStrategy', function () {

  describe('search', function () {

    let searchArgs;

    beforeEach(() => {
      const msearchMock = jest.fn().mockReturnValue(Promise.resolve([]));

      searchArgs = {
        searchRequests: [],
        es: { msearch: msearchMock },
        Promise,
        serializeFetchParams: () => Promise.resolve([]),
      };
    });

    test('does not send max_concurrent_shard_requests by default', async () => {
      await search(searchArgs);
      expect(searchArgs.es.msearch.mock.calls[0][0]).not.toHaveProperty('max_concurrent_shard_requests');
    });

    test('allows configuration of max_concurrent_shard_requests', async () => {
      searchArgs.maxConcurrentShardRequests = 42;
      await search(searchArgs);
      expect(searchArgs.es.msearch.mock.calls[0][0].max_concurrent_shard_requests).toBe(42);
    });

    test('should set rest_total_hits_as_int to true on a request', async () => {
      await search(searchArgs);
      expect(searchArgs.es.msearch.mock.calls[0][0]).toHaveProperty('rest_total_hits_as_int', true);
    });

    test('should set ignore_throttled=false when including frozen indices', async () => {
      await search({ ...searchArgs, includeFrozen: true });
      expect(searchArgs.es.msearch.mock.calls[0][0]).toHaveProperty('ignore_throttled', false);
    });

  });

});
