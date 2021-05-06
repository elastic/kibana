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
import { ResponseError } from '@elastic/elasticsearch/lib/errors';
import * as rollupWrongIndexException from '../../../../common/search/test_data/rollup_wrong_index_exception.json';
import { KbnServerError } from '../../../../../kibana_utils/server';

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

describe('Rollup search strategy', () => {
  const mockApiCaller = jest.fn();
  const mockLogger: any = {
    debug: () => {},
  };
  const mockDeps = ({
    uiSettingsClient: {
      get: jest.fn(),
    },
    esClient: {
      asCurrentUser: {
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

  it('throws normalized error on ResponseError', async () => {
    const errResponse = new ResponseError({
      body: rollupWrongIndexException,
      statusCode: 400,
      headers: {},
      warnings: [],
      meta: {} as any,
    });

    mockApiCaller.mockRejectedValueOnce(errResponse);

    const params = { index: 'non-rollup-index', body: {} };
    const rollupSearch = await rollupSearchStrategyProvider(mockLegacyConfig$, mockLogger);

    let err: KbnServerError | undefined;
    try {
      await rollupSearch.search({ params }, {}, mockDeps).toPromise();
    } catch (e) {
      err = e;
    }

    expect(mockApiCaller).toBeCalled();
    expect(err).toBeInstanceOf(KbnServerError);
    expect(err?.statusCode).toBe(400);
    expect(err?.message).toBe(errResponse.message);
    expect(err?.errBody).toBe(rollupWrongIndexException);
  });
});
