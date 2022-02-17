/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { elasticsearchServiceMock } from '../../../../../../core/server/mocks';
import { pluginInitializerContextConfigMock } from '../../../../../../core/server/mocks';
import { esSearchStrategyProvider } from './es_search_strategy';
import { SearchStrategyDependencies } from '../../types';

import * as indexNotFoundException from '../../../../common/search/test_data/index_not_found_exception.json';
import { errors } from '@elastic/elasticsearch';
import { KbnServerError } from '../../../../../kibana_utils/server';

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

  it('calls the API caller with the params with defaults', async (done) => {
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
        done();
      });
  });

  it('calls the API caller with overridden defaults', async (done) => {
    const params = { index: 'logstash-*', ignore_unavailable: false, timeout: '1000ms' };

    await esSearchStrategyProvider(mockConfig$, mockLogger)
      .search({ params }, {}, getMockedDeps())
      .subscribe(() => {
        expect(esClient.search).toBeCalled();
        expect(esClient.search.mock.calls[0][0]).toEqual({
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
        getMockedDeps()
      )
      .subscribe((data) => {
        expect(data.isRunning).toBe(false);
        expect(data.isPartial).toBe(false);
        expect(data).toHaveProperty('loaded');
        expect(data).toHaveProperty('rawResponse');
        done();
      }));

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
  });

  it('throws normalized error if ResponseError is thrown', async (done) => {
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
      expect(e).toBeInstanceOf(KbnServerError);
      expect(e.statusCode).toBe(404);
      expect(e.message).toBe(errResponse.message);
      expect(e.errBody).toBe(indexNotFoundException);
      done();
    }
  });

  it('throws normalized error if ElasticsearchClientError is thrown', async (done) => {
    const params = { index: 'logstash-*', ignore_unavailable: false, timeout: '1000ms' };
    const errResponse = new errors.ElasticsearchClientError('This is a general ESClient error');

    try {
      await esSearchStrategyProvider(mockConfig$, mockLogger)
        .search({ params }, {}, getMockedDeps(errResponse))
        .toPromise();
    } catch (e) {
      expect(esClient.search).toBeCalled();
      expect(e).toBeInstanceOf(KbnServerError);
      expect(e.statusCode).toBe(500);
      expect(e.message).toBe(errResponse.message);
      expect(e.errBody).toBe(undefined);
      done();
    }
  });

  it('throws normalized error if ESClient throws unknown error', async (done) => {
    const params = { index: 'logstash-*', ignore_unavailable: false, timeout: '1000ms' };
    const errResponse = new Error('ESClient error');

    try {
      await esSearchStrategyProvider(mockConfig$, mockLogger)
        .search({ params }, {}, getMockedDeps(errResponse))
        .toPromise();
    } catch (e) {
      expect(esClient.search).toBeCalled();
      expect(e).toBeInstanceOf(KbnServerError);
      expect(e.statusCode).toBe(500);
      expect(e.message).toBe(errResponse.message);
      expect(e.errBody).toBe(undefined);
      done();
    }
  });

  it('throws KbnServerError for unknown index type', async (done) => {
    const params = { index: 'logstash-*', ignore_unavailable: false, timeout: '1000ms' };

    try {
      await esSearchStrategyProvider(mockConfig$, mockLogger)
        .search({ indexType: 'banana', params }, {}, getMockedDeps())
        .toPromise();
    } catch (e) {
      expect(esClient.search).not.toBeCalled();
      expect(e).toBeInstanceOf(KbnServerError);
      expect(e.message).toBe('Unsupported index pattern type banana');
      expect(e.statusCode).toBe(400);
      expect(e.errBody).toBe(undefined);
      done();
    }
  });
});
