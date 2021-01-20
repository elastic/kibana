/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

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

  it('calls the API caller with the params with defaults', async (done) => {
    const params = { index: 'logstash-*' };

    await esSearchStrategyProvider(mockConfig$, mockLogger)
      .search({ params }, {}, mockDeps)
      .subscribe(() => {
        expect(mockApiCaller).toBeCalled();
        expect(mockApiCaller.mock.calls[0][0]).toEqual({
          ...params,
          ignore_unavailable: true,
          track_total_hits: true,
        });
        done();
      });
  });

  it('calls the API caller with overridden defaults', async (done) => {
    const params = { index: 'logstash-*', ignore_unavailable: false, timeout: '1000ms' };

    await esSearchStrategyProvider(mockConfig$, mockLogger)
      .search({ params }, {}, mockDeps)
      .subscribe(() => {
        expect(mockApiCaller).toBeCalled();
        expect(mockApiCaller.mock.calls[0][0]).toEqual({
          ...params,
          track_total_hits: true,
        });
        done();
      });
  });

  it('has all response parameters', async (done) =>
    await esSearchStrategyProvider(mockConfig$, mockLogger)
      .search(
        {
          params: { index: 'logstash-*' },
        },
        {},
        mockDeps
      )
      .subscribe((data) => {
        expect(data.isRunning).toBe(false);
        expect(data.isPartial).toBe(false);
        expect(data).toHaveProperty('loaded');
        expect(data).toHaveProperty('rawResponse');
        done();
      }));
});
