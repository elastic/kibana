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

import { RequestHandlerContext } from '../../../../../core/server';
import { pluginInitializerContextConfigMock } from '../../../../../core/server/mocks';
import { esSearchStrategyProvider } from './es_search_strategy';

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
  const mockContext = {
    core: { elasticsearch: { client: { asCurrentUser: { search: mockApiCaller } } } },
  };
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
    const esSearch = await esSearchStrategyProvider(mockConfig$, mockLogger);

    await esSearch.search((mockContext as unknown) as RequestHandlerContext, { params });

    expect(mockApiCaller).toBeCalled();
    expect(mockApiCaller.mock.calls[0][0]).toEqual({
      ...params,
      timeout: '0ms',
      ignoreUnavailable: true,
      restTotalHitsAsInt: true,
    });
  });

  it('calls the API caller with overridden defaults', async () => {
    const params = { index: 'logstash-*', ignoreUnavailable: false, timeout: '1000ms' };
    const esSearch = await esSearchStrategyProvider(mockConfig$, mockLogger);

    await esSearch.search((mockContext as unknown) as RequestHandlerContext, { params });

    expect(mockApiCaller).toBeCalled();
    expect(mockApiCaller.mock.calls[0][0]).toEqual({
      ...params,
      restTotalHitsAsInt: true,
    });
  });

  it('has all response parameters', async () => {
    const params = { index: 'logstash-*' };
    const esSearch = await esSearchStrategyProvider(mockConfig$, mockLogger);

    const response = await esSearch.search((mockContext as unknown) as RequestHandlerContext, {
      params,
    });

    expect(response.isRunning).toBe(false);
    expect(response.isPartial).toBe(false);
    expect(response).toHaveProperty('loaded');
    expect(response).toHaveProperty('rawResponse');
  });
});
