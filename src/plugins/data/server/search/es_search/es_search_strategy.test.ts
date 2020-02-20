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

import { coreMock, pluginInitializerContextConfigMock } from '../../../../../core/server/mocks';
import { esSearchStrategyProvider } from './es_search_strategy';

describe('ES search strategy', () => {
  const mockCoreSetup = coreMock.createSetup();
  const mockApiCaller = jest.fn().mockResolvedValue({
    _shards: {
      total: 10,
      failed: 1,
      skipped: 2,
      successful: 7,
    },
  });
  const mockSearch = jest.fn();
  const mockConfig$ = pluginInitializerContextConfigMock<any>({}).legacy.globalConfig$;

  beforeEach(() => {
    mockApiCaller.mockClear();
    mockSearch.mockClear();
  });

  it('returns a strategy with `search`', () => {
    const esSearch = esSearchStrategyProvider(
      {
        core: mockCoreSetup,
        config$: mockConfig$,
      },
      mockApiCaller,
      mockSearch
    );

    expect(typeof esSearch.search).toBe('function');
  });

  it('logs the response if `debug` is set to `true`', async () => {
    const spy = jest.spyOn(console, 'log');
    const esSearch = esSearchStrategyProvider(
      {
        core: mockCoreSetup,
        config$: mockConfig$,
      },
      mockApiCaller,
      mockSearch
    );

    expect(spy).not.toBeCalled();

    await esSearch.search({ params: {}, debug: true });

    expect(spy).toBeCalled();
  });

  it('calls the API caller with the params with defaults', async () => {
    const params = { index: 'logstash-*' };
    const esSearch = esSearchStrategyProvider(
      {
        core: mockCoreSetup,
        config$: mockConfig$,
      },
      mockApiCaller,
      mockSearch
    );

    await esSearch.search({ params });

    expect(mockApiCaller).toBeCalled();
    expect(mockApiCaller.mock.calls[0][0]).toBe('search');
    expect(mockApiCaller.mock.calls[0][1]).toEqual({
      ...params,
      timeout: '0ms',
      ignoreUnavailable: true,
      restTotalHitsAsInt: true,
    });
  });

  it('calls the API caller with overridden defaults', async () => {
    const params = { index: 'logstash-*', ignoreUnavailable: false, timeout: '1000ms' };
    const esSearch = esSearchStrategyProvider(
      {
        core: mockCoreSetup,
        config$: mockConfig$,
      },
      mockApiCaller,
      mockSearch
    );

    await esSearch.search({ params });

    expect(mockApiCaller).toBeCalled();
    expect(mockApiCaller.mock.calls[0][0]).toBe('search');
    expect(mockApiCaller.mock.calls[0][1]).toEqual({
      ...params,
      restTotalHitsAsInt: true,
    });
  });

  it('returns total, loaded, and raw response', async () => {
    const params = { index: 'logstash-*' };
    const esSearch = esSearchStrategyProvider(
      {
        core: mockCoreSetup,
        config$: mockConfig$,
      },
      mockApiCaller,
      mockSearch
    );

    const response = await esSearch.search({ params });

    expect(response).toHaveProperty('total');
    expect(response).toHaveProperty('loaded');
    expect(response).toHaveProperty('rawResponse');
  });
});
