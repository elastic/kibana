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

import { first } from 'rxjs/operators';
import { pluginInitializerContextConfigMock } from '../../../../../core/server/mocks';
import { esSearchStrategyProvider } from './es_search_strategy';
import { SearchStrategyDependencies } from '../types';

describe('ES search strategy', () => {
  const mockLogger: any = {
    debug: () => {},
  };
  const mockApiCaller = jest.fn().mockResolvedValue({
    body: {
      _shards: {
        total: 10,
        failed: 1,
        skipped: 2,
        successful: 7,
      },
    },
  });

  const mockDeps = ({
    uiSettingsClient: {
      get: () => {},
    },
    esClient: { asCurrentUser: { search: mockApiCaller } },
  } as unknown) as SearchStrategyDependencies;

  const mockConfig$ = pluginInitializerContextConfigMock<any>({}).legacy.globalConfig$;

  beforeEach(() => {
    mockApiCaller.mockClear();
  });

  it('returns a strategy with `search`', async () => {
    const esSearch = await esSearchStrategyProvider(mockConfig$, mockLogger);

    expect(typeof esSearch.search).toBe('function');
  });

  it('calls the API caller with the params with defaults', async () => {
    const params = { index: 'logstash-*' };

    const promise = await esSearchStrategyProvider(mockConfig$, mockLogger)
      .search({ params }, {}, mockDeps)
      .pipe(first())
      .toPromise();
    await promise;

    expect(mockApiCaller).toBeCalled();
    expect(mockApiCaller.mock.calls[0][0]).toEqual({
      ...params,
      ignore_unavailable: true,
      track_total_hits: true,
    });
  });

  it('calls the API caller with overridden defaults', async () => {
    const params = { index: 'logstash-*', ignore_unavailable: false, timeout: '1000ms' };

    const promise = await esSearchStrategyProvider(mockConfig$, mockLogger)
      .search({ params }, {}, mockDeps)
      .pipe(first())
      .toPromise();
    await promise;

    expect(mockApiCaller).toBeCalled();
    expect(mockApiCaller.mock.calls[0][0]).toEqual({
      ...params,
      track_total_hits: true,
    });
  });

  it('has all response parameters', async () => {
    const promise = await esSearchStrategyProvider(mockConfig$, mockLogger)
      .search(
        {
          params: { index: 'logstash-*' },
        },
        {},
        mockDeps
      )
      .pipe(first())
      .toPromise();
    await promise;

    expect(promise.isRunning).toBe(false);
    expect(promise.isPartial).toBe(false);
    expect(promise).toHaveProperty('loaded');
    expect(promise).toHaveProperty('rawResponse');
  });
});
