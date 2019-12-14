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
import { IUiSettingsClient } from '../../../../../core/public';
import { SearchStrategySearchParams } from './types';

const { search } = defaultSearchStrategy;

function getConfigStub(config: any = {}) {
  return {
    get: key => config[key],
  } as IUiSettingsClient;
}

const msearchMockResponse: any = Promise.resolve([]);
msearchMockResponse.abort = jest.fn();
const msearchMock = jest.fn().mockReturnValue(msearchMockResponse);

const searchMockResponse: any = Promise.resolve([]);
searchMockResponse.abort = jest.fn();
const searchMock = jest.fn().mockReturnValue(searchMockResponse);

describe('defaultSearchStrategy', function() {
  describe('search', function() {
    let searchArgs: MockedKeys<Omit<SearchStrategySearchParams, 'config'>>;

    beforeEach(() => {
      msearchMockResponse.abort.mockClear();
      msearchMock.mockClear();

      searchMockResponse.abort.mockClear();
      searchMock.mockClear();

      searchArgs = {
        searchRequests: [
          {
            index: { title: 'foo' },
          },
        ],
        esShardTimeout: 0,
        es: {
          msearch: msearchMock,
          search: searchMock,
        },
      };
    });

    test('does not send max_concurrent_shard_requests by default', async () => {
      const config = getConfigStub({ 'courier:batchSearches': true });
      await search({ ...searchArgs, config });
      expect(searchArgs.es.msearch.mock.calls[0][0].max_concurrent_shard_requests).toBe(undefined);
    });

    test('allows configuration of max_concurrent_shard_requests', async () => {
      const config = getConfigStub({
        'courier:batchSearches': true,
        'courier:maxConcurrentShardRequests': 42,
      });
      await search({ ...searchArgs, config });
      expect(searchArgs.es.msearch.mock.calls[0][0].max_concurrent_shard_requests).toBe(42);
    });

    test('should set rest_total_hits_as_int to true on a request', async () => {
      const config = getConfigStub({ 'courier:batchSearches': true });
      await search({ ...searchArgs, config });
      expect(searchArgs.es.msearch.mock.calls[0][0]).toHaveProperty('rest_total_hits_as_int', true);
    });

    test('should set ignore_throttled=false when including frozen indices', async () => {
      const config = getConfigStub({
        'courier:batchSearches': true,
        'search:includeFrozen': true,
      });
      await search({ ...searchArgs, config });
      expect(searchArgs.es.msearch.mock.calls[0][0]).toHaveProperty('ignore_throttled', false);
    });

    test('should properly call abort with msearch', () => {
      const config = getConfigStub({
        'courier:batchSearches': true,
      });
      search({ ...searchArgs, config }).abort();
      expect(msearchMockResponse.abort).toHaveBeenCalled();
    });

    test('should properly abort with search', async () => {
      const config = getConfigStub({
        'courier:batchSearches': false,
      });
      search({ ...searchArgs, config }).abort();
      expect(searchMockResponse.abort).toHaveBeenCalled();
    });
  });
});
