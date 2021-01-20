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

import {
  elasticsearchClientMock,
  MockedTransportRequestPromise,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../core/server/elasticsearch/client/mocks';
import { pluginInitializerContextConfigMock } from '../../../../../core/server/mocks';
import { esSearchStrategyProvider } from './es_search_strategy';
import { SearchStrategyDependencies } from '../types';

import * as indexNotFoundException from '../../../common/search/test_data/index_not_found_exception.json';
import { ElasticsearchClientError, ResponseError } from '@elastic/elasticsearch/lib/errors';
import { KbnServerError } from '../../../../kibana_utils/server';

describe('ES search strategy', () => {
  const successBody = {
    _shards: {
      total: 10,
      failed: 1,
      skipped: 2,
      successful: 7,
    },
  };
  let mockedApiCaller: MockedTransportRequestPromise<any>;
  let mockApiCaller: jest.Mock<() => MockedTransportRequestPromise<any>>;
  const mockLogger: any = {
    debug: () => {},
  };

  function getMockedDeps(err?: Record<string, any>) {
    mockApiCaller = jest.fn().mockImplementation(() => {
      if (err) {
        mockedApiCaller = elasticsearchClientMock.createErrorTransportRequestPromise(err);
      } else {
        mockedApiCaller = elasticsearchClientMock.createSuccessTransportRequestPromise(
          successBody,
          { statusCode: 200 }
        );
      }
      return mockedApiCaller;
    });

    return ({
      uiSettingsClient: {
        get: () => {},
      },
      esClient: { asCurrentUser: { search: mockApiCaller } },
    } as unknown) as SearchStrategyDependencies;
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
      .search({ params }, {}, getMockedDeps())
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
        getMockedDeps()
      )
      .subscribe((data) => {
        expect(data.isRunning).toBe(false);
        expect(data.isPartial).toBe(false);
        expect(data).toHaveProperty('loaded');
        expect(data).toHaveProperty('rawResponse');
        expect(mockedApiCaller.abort).not.toBeCalled();
        done();
      }));

  it('can be aborted', async () => {
    const params = { index: 'logstash-*', ignore_unavailable: false, timeout: '1000ms' };

    const abortController = new AbortController();
    abortController.abort();

    await esSearchStrategyProvider(mockConfig$, mockLogger)
      .search({ params }, { abortSignal: abortController.signal }, getMockedDeps())
      .toPromise();

    expect(mockApiCaller).toBeCalled();
    expect(mockApiCaller.mock.calls[0][0]).toEqual({
      ...params,
      track_total_hits: true,
    });
    expect(mockedApiCaller.abort).toBeCalled();
  });

  it('throws normalized error if ResponseError is thrown', async (done) => {
    const params = { index: 'logstash-*', ignore_unavailable: false, timeout: '1000ms' };
    const errResponse = new ResponseError({
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
      expect(mockApiCaller).toBeCalled();
      expect(e).toBeInstanceOf(KbnServerError);
      expect(e.statusCode).toBe(404);
      expect(e.message).toBe(errResponse.message);
      expect(e.attributes).toBe(indexNotFoundException);
      done();
    }
  });

  it('throws normalized error if ElasticsearchClientError is thrown', async (done) => {
    const params = { index: 'logstash-*', ignore_unavailable: false, timeout: '1000ms' };
    const errResponse = new ElasticsearchClientError('This is a general ESClient error');

    try {
      await esSearchStrategyProvider(mockConfig$, mockLogger)
        .search({ params }, {}, getMockedDeps(errResponse))
        .toPromise();
    } catch (e) {
      expect(mockApiCaller).toBeCalled();
      expect(e).toBeInstanceOf(KbnServerError);
      expect(e.statusCode).toBe(500);
      expect(e.message).toBe(errResponse.message);
      expect(e.attributes).toBe(undefined);
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
      expect(mockApiCaller).toBeCalled();
      expect(e).toBeInstanceOf(KbnServerError);
      expect(e.statusCode).toBe(500);
      expect(e.message).toBe(errResponse.message);
      expect(e.attributes).toBe(undefined);
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
      expect(mockApiCaller).not.toBeCalled();
      expect(e).toBeInstanceOf(KbnServerError);
      expect(e.message).toBe('Unsupported index pattern type banana');
      expect(e.statusCode).toBe(400);
      expect(e.attributes).toBe(undefined);
      done();
    }
  });
});
