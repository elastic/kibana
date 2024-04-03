/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { pluginInitializerContextConfigMock } from '@kbn/core/server/mocks';
import { esSearchStrategyProvider } from './es_search_strategy';
import { SearchStrategyDependencies } from '../../types';

import indexNotFoundException from '../../../../common/search/test_data/index_not_found_exception.json';
import { errors } from '@elastic/elasticsearch';
import { KbnSearchError } from '../../report_search_error';
import { firstValueFrom } from 'rxjs';

describe('ES search strategy', () => {
  const successBody = {
    _shards: {
      total: 10,
      failed: 1,
      skipped: 2,
      successful: 7,
    },
  } as estypes.SearchResponse;

  const mockLogger: any = {
    debug: () => {},
  };

  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  function getMockedDeps(err?: Record<string, any>) {
    esClient = elasticsearchServiceMock.createElasticsearchClient();

    if (err) {
      esClient.search.mockImplementation(() => Promise.reject(err));
    } else {
      esClient.search.mockResponse(successBody, { statusCode: 200 });
    }

    return {
      uiSettingsClient: {
        get: () => {},
      },
      esClient: { asCurrentUser: esClient },
    } as unknown as SearchStrategyDependencies;
  }

  const mockConfig$ = pluginInitializerContextConfigMock<any>({}).legacy.globalConfig$;

  it('returns a strategy with `search`', async () => {
    const esSearch = await esSearchStrategyProvider(mockConfig$, mockLogger);

    expect(typeof esSearch.search).toBe('function');
  });

  it('calls the API caller with the params with defaults', async () => {
    const params = { index: 'logstash-*' };

    await esSearchStrategyProvider(mockConfig$, mockLogger)
      .search({ params }, {}, getMockedDeps())
      .subscribe(() => {
        expect(esClient.search).toBeCalled();
        expect(esClient.search.mock.calls[0][0]).toEqual({
          ...params,
          ignore_unavailable: true,
          track_total_hits: true,
        });
      });
  });

  it('calls the API caller with overridden defaults', async () => {
    const params = { index: 'logstash-*', ignore_unavailable: false, timeout: '1000ms' };

    await esSearchStrategyProvider(mockConfig$, mockLogger)
      .search({ params }, {}, getMockedDeps())
      .subscribe(() => {
        expect(esClient.search).toBeCalled();
        expect(esClient.search.mock.calls[0][0]).toEqual({
          ...params,
          track_total_hits: true,
        });
      });
  });

  it('has all response parameters', async () =>
    await esSearchStrategyProvider(mockConfig$, mockLogger)
      .search(
        {
          params: { index: 'logstash-*' },
        },
        {},
        getMockedDeps()
      )
      .subscribe((data) => {
        expect(data.isRunning).toBe(false);
        expect(data.isPartial).toBe(false);
        expect(data).toHaveProperty('loaded');
        expect(data).toHaveProperty('rawResponse');
      }));

  it('calls the client with transport options', async () => {
    const params = { index: 'logstash-*', ignore_unavailable: false, timeout: '1000ms' };
    await firstValueFrom(
      esSearchStrategyProvider(mockConfig$, mockLogger).search(
        { params },
        { transport: { maxRetries: 5 } },
        getMockedDeps()
      )
    );
    const [, searchOptions] = esClient.search.mock.calls[0];
    expect(searchOptions).toEqual({ signal: undefined, maxRetries: 5, meta: true });
  });

  it('can be aborted', async () => {
    const params = { index: 'logstash-*', ignore_unavailable: false, timeout: '1000ms' };

    const abortController = new AbortController();
    abortController.abort();

    await esSearchStrategyProvider(mockConfig$, mockLogger)
      .search({ params }, { abortSignal: abortController.signal }, getMockedDeps())
      .toPromise();

    expect(esClient.search).toBeCalled();
    expect(esClient.search.mock.calls[0][0]).toEqual({
      ...params,
      track_total_hits: true,
    });
    expect(esClient.search.mock.calls[0][1]).toEqual({
      signal: expect.any(AbortSignal),
      meta: true,
    });
  });

  it('throws normalized error if ResponseError is thrown', async () => {
    const params = { index: 'logstash-*', ignore_unavailable: false, timeout: '1000ms' };
    const errResponse = new errors.ResponseError({
      body: indexNotFoundException,
      statusCode: 404,
      headers: {},
      warnings: [],
      meta: {} as any,
    });

    try {
      await esSearchStrategyProvider(mockConfig$, mockLogger)
        .search({ params }, {}, getMockedDeps(errResponse))
        .toPromise();
    } catch (e) {
      expect(esClient.search).toBeCalled();
      expect(e).toBeInstanceOf(KbnSearchError);
      expect(e.statusCode).toBe(404);
      expect(e.message).toBe(errResponse.message);
      expect(e.errBody).toEqual(indexNotFoundException);
    }
  });

  it('throws normalized error if ElasticsearchClientError is thrown', async () => {
    const params = { index: 'logstash-*', ignore_unavailable: false, timeout: '1000ms' };
    const errResponse = new errors.ElasticsearchClientError('This is a general ESClient error');

    try {
      await esSearchStrategyProvider(mockConfig$, mockLogger)
        .search({ params }, {}, getMockedDeps(errResponse))
        .toPromise();
    } catch (e) {
      expect(esClient.search).toBeCalled();
      expect(e).toBeInstanceOf(KbnSearchError);
      expect(e.statusCode).toBe(500);
      expect(e.message).toBe(errResponse.message);
      expect(e.errBody).toBe(undefined);
    }
  });

  it('throws normalized error if ESClient throws unknown error', async () => {
    const params = { index: 'logstash-*', ignore_unavailable: false, timeout: '1000ms' };
    const errResponse = new Error('ESClient error');

    try {
      await esSearchStrategyProvider(mockConfig$, mockLogger)
        .search({ params }, {}, getMockedDeps(errResponse))
        .toPromise();
    } catch (e) {
      expect(esClient.search).toBeCalled();
      expect(e).toBeInstanceOf(KbnSearchError);
      expect(e.statusCode).toBe(500);
      expect(e.message).toBe(errResponse.message);
      expect(e.errBody).toBe(undefined);
    }
  });

  it('throws KbnSearchError for unknown index type', async () => {
    const params = { index: 'logstash-*', ignore_unavailable: false, timeout: '1000ms' };

    try {
      await esSearchStrategyProvider(mockConfig$, mockLogger)
        .search({ indexType: 'banana', params }, {}, getMockedDeps())
        .toPromise();
    } catch (e) {
      expect(esClient.search).not.toBeCalled();
      expect(e).toBeInstanceOf(KbnSearchError);
      expect(e.message).toBe('Unsupported index pattern type banana');
      expect(e.statusCode).toBe(400);
      expect(e.errBody).toBe(undefined);
    }
  });
});
