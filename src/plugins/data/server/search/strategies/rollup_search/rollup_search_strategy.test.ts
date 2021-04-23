/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import { SearchStrategyDependencies } from '../../types';
import { rollupSearchStrategyProvider } from './rollup_search_strategy';
import { createSearchSessionsClientMock } from '../../mocks';

const mockRollupResponse = {
  body: {
    _shards: {
      total: 10,
      failed: 1,
      skipped: 2,
      successful: 7,
    },
  },
};

describe('ES search strategy', () => {
  const mockApiCaller = jest.fn();
  const mockGetCaller = jest.fn();
  const mockSubmitCaller = jest.fn();
  const mockDeleteCaller = jest.fn();
  const mockLogger: any = {
    debug: () => {},
  };
  const mockDeps = ({
    uiSettingsClient: {
      get: jest.fn(),
    },
    esClient: {
      asCurrentUser: {
        asyncSearch: {
          get: mockGetCaller,
          submit: mockSubmitCaller,
          delete: mockDeleteCaller,
        },
        transport: { request: mockApiCaller },
      },
    },
    searchSessionsClient: createSearchSessionsClientMock(),
  } as unknown) as SearchStrategyDependencies;
  const mockLegacyConfig$ = new BehaviorSubject<any>({
    elasticsearch: {
      shardTimeout: {
        asMilliseconds: () => {
          return 100;
        },
      },
    },
  });

  beforeEach(() => {
    mockApiCaller.mockClear();
    mockGetCaller.mockClear();
    mockSubmitCaller.mockClear();
    mockDeleteCaller.mockClear();
  });

  it('calls the rollup API', async () => {
    mockApiCaller.mockResolvedValueOnce(mockRollupResponse);

    const params = { index: 'foo-程', body: {} };
    const rollupSearch = rollupSearchStrategyProvider(mockLegacyConfig$, mockLogger);

    await rollupSearch
      .search(
        {
          params,
        },
        {},
        mockDeps
      )
      .toPromise();

    expect(mockApiCaller).toBeCalled();
    const { method, path } = mockApiCaller.mock.calls[0][0];
    expect(method).toBe('POST');
    expect(path).toBe('/foo-%E7%A8%8B/_rollup_search');
  });
});
