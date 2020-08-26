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

import { HttpStart, IUiSettingsClient } from 'src/core/public';
import { coreMock } from '../../../../../core/public/mocks';
import { defaultSearchStrategy } from './default_search_strategy';
import { SearchStrategySearchParams } from './types';
import { UI_SETTINGS } from '../../../common';

const { search } = defaultSearchStrategy;

function getConfigStub(config: any = {}) {
  return {
    get: (key) => config[key],
  } as IUiSettingsClient;
}

const msearchMock = jest.fn().mockResolvedValue({ body: { responses: [] } });

describe('defaultSearchStrategy', function () {
  describe('search', function () {
    let searchArgs: MockedKeys<Omit<SearchStrategySearchParams, 'config'>>;
    let es: any;
    let http: jest.Mocked<HttpStart>;

    beforeEach(() => {
      msearchMock.mockClear();

      http = coreMock.createStart().http;
      http.post.mockResolvedValue(msearchMock);

      searchArgs = {
        searchRequests: [
          {
            index: { title: 'foo' },
          },
        ],
        esShardTimeout: 0,
        http,
      };

      es = http.post;
    });

    test('does not send max_concurrent_shard_requests by default', async () => {
      const config = getConfigStub({ [UI_SETTINGS.COURIER_BATCH_SEARCHES]: true });
      await search({ ...searchArgs, config });
      expect(es.mock.calls[0][1].query.max_concurrent_shard_requests).toBe(undefined);
    });

    test('allows configuration of max_concurrent_shard_requests', async () => {
      const config = getConfigStub({
        [UI_SETTINGS.COURIER_BATCH_SEARCHES]: true,
        [UI_SETTINGS.COURIER_MAX_CONCURRENT_SHARD_REQUESTS]: 42,
      });
      await search({ ...searchArgs, config });
      expect(es.mock.calls[0][1].query.max_concurrent_shard_requests).toBe(42);
    });

    test('should set rest_total_hits_as_int to true on a request', async () => {
      const config = getConfigStub({ [UI_SETTINGS.COURIER_BATCH_SEARCHES]: true });
      await search({ ...searchArgs, config });
      expect(es.mock.calls[0][1].query).toHaveProperty('rest_total_hits_as_int', true);
    });

    test('should set ignore_throttled=false when including frozen indices', async () => {
      const config = getConfigStub({
        [UI_SETTINGS.COURIER_BATCH_SEARCHES]: true,
        [UI_SETTINGS.SEARCH_INCLUDE_FROZEN]: true,
      });
      await search({ ...searchArgs, config });
      expect(es.mock.calls[0][1].query).toHaveProperty('ignore_throttled', false);
    });
  });
});
