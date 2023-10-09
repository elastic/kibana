/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { KbnServerError } from '@kbn/kibana-utils-plugin/server';
import { KbnSearchError } from '../../report_search_error';
import { errors } from '@elastic/elasticsearch';
import * as indexNotFoundException from '../../../../common/search/test_data/index_not_found_exception.json';
import * as xContentParseException from '../../../../common/search/test_data/x_content_parse_exception.json';
import { SearchStrategyDependencies } from '../../types';
import { enhancedEsSearchStrategyProvider } from './ese_search_strategy';
import { createSearchSessionsClientMock } from '../../mocks';
import { getMockSearchConfig } from '../../../../config.mock';

const mockAsyncResponse = {
  body: {
    id: 'foo',
    response: {
      _shards: {
        total: 10,
        failed: 1,
        skipped: 2,
        successful: 7,
      },
    },
  },
};

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
  const mockDeps = {
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
    rollupsEnabled: true,
  } as unknown as SearchStrategyDependencies;
  const mockLegacyConfig$ = new BehaviorSubject<any>({
    elasticsearch: {
      shardTimeout: {
        asMilliseconds: () => {
          return 100;
        },
      },
    },
  });

  const mockSearchConfig = getMockSearchConfig({});

  beforeEach(() => {
    mockApiCaller.mockClear();
    mockGetCaller.mockClear();
    mockSubmitCaller.mockClear();
    mockDeleteCaller.mockClear();
  });

  it('returns a strategy with `search and `cancel`', async () => {
    const esSearch = await enhancedEsSearchStrategyProvider(
      mockLegacyConfig$,
      mockSearchConfig,
      mockLogger
    );

    expect(typeof esSearch.search).toBe('function');
  });

  describe('search', () => {
    describe('no sessionId', () => {
      it('makes a POST request with params when no ID provided', async () => {
        mockSubmitCaller.mockResolvedValueOnce(mockAsyncResponse);

        const params = { index: 'logstash-*', body: { query: {} } };
        const esSearch = await enhancedEsSearchStrategyProvider(
          mockLegacyConfig$,
          mockSearchConfig,
          mockLogger
        );

        await esSearch.search({ params }, {}, mockDeps).toPromise();

        expect(mockSubmitCaller).toBeCalled();
        const request = mockSubmitCaller.mock.calls[0][0];
        expect(request.index).toEqual(params.index);
        expect(request.body).toEqual(params.body);
        expect(request).toHaveProperty('keep_alive', '60000ms');
      });

      it('makes a GET request to async search with ID', async () => {
        mockGetCaller.mockResolvedValueOnce(mockAsyncResponse);

        const params = { index: 'logstash-*', body: { query: {} } };
        const esSearch = await enhancedEsSearchStrategyProvider(
          mockLegacyConfig$,
          mockSearchConfig,
          mockLogger
        );

        await esSearch.search({ id: 'foo', params }, {}, mockDeps).toPromise();

        expect(mockGetCaller).toBeCalled();
        const request = mockGetCaller.mock.calls[0][0];
        expect(request.id).toEqual('foo');
        expect(request).toHaveProperty('wait_for_completion_timeout');
        expect(request).toHaveProperty('keep_alive', '60000ms');
      });

      it('sets transport options on POST requests', async () => {
        const transportOptions = { maxRetries: 1 };
        mockSubmitCaller.mockResolvedValueOnce(mockAsyncResponse);
        const params = { index: 'logstash-*', body: { query: {} } };
        const esSearch = enhancedEsSearchStrategyProvider(
          mockLegacyConfig$,
          mockSearchConfig,
          mockLogger
        );

        await firstValueFrom(
          esSearch.search({ params }, { transport: transportOptions }, mockDeps)
        );

        expect(mockSubmitCaller).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            batched_reduce_size: 64,
            body: { query: {} },
            ignore_unavailable: true,
            index: 'logstash-*',
            keep_alive: '60000ms',
            keep_on_completion: false,
            max_concurrent_shard_requests: undefined,
            track_total_hits: true,
            wait_for_completion_timeout: '100ms',
          }),
          expect.objectContaining({ maxRetries: 1, meta: true, signal: undefined })
        );
      });

      it('sets transport options on GET requests', async () => {
        mockGetCaller.mockResolvedValueOnce(mockAsyncResponse);
        const params = { index: 'logstash-*', body: { query: {} } };
        const esSearch = enhancedEsSearchStrategyProvider(
          mockLegacyConfig$,
          mockSearchConfig,
          mockLogger
        );

        await firstValueFrom(
          esSearch.search({ id: 'foo', params }, { transport: { maxRetries: 1 } }, mockDeps)
        );

        expect(mockGetCaller).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            id: 'foo',
            keep_alive: '60000ms',
            wait_for_completion_timeout: '100ms',
          }),
          expect.objectContaining({ maxRetries: 1, meta: true, signal: undefined })
        );
      });

      it('sets wait_for_completion_timeout and keep_alive in the request', async () => {
        mockSubmitCaller.mockResolvedValueOnce(mockAsyncResponse);

        const params = { index: 'foo-*', body: {} };
        const esSearch = await enhancedEsSearchStrategyProvider(
          mockLegacyConfig$,
          mockSearchConfig,
          mockLogger
        );

        await esSearch.search({ params }, {}, mockDeps).toPromise();

        expect(mockSubmitCaller).toBeCalled();
        const request = mockSubmitCaller.mock.calls[0][0];
        expect(request).toHaveProperty('wait_for_completion_timeout');
        expect(request).toHaveProperty('keep_alive');
      });

      it('calls the rollup API if the index is a rollup type', async () => {
        mockApiCaller.mockResolvedValueOnce(mockRollupResponse);

        const params = { index: 'foo-程', body: {} };
        const esSearch = await enhancedEsSearchStrategyProvider(
          mockLegacyConfig$,
          mockSearchConfig,
          mockLogger
        );

        await esSearch
          .search(
            {
              indexType: 'rollup',
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

      it("doesn't call the rollup API if the index is a rollup type BUT rollups are disabled", async () => {
        mockApiCaller.mockResolvedValueOnce(mockRollupResponse);
        mockSubmitCaller.mockResolvedValueOnce(mockAsyncResponse);

        const params = { index: 'foo-程', body: { query: {} } };
        const esSearch = await enhancedEsSearchStrategyProvider(
          mockLegacyConfig$,
          mockSearchConfig,
          mockLogger
        );

        await esSearch
          .search(
            {
              indexType: 'rollup',
              params,
            },
            {},
            { ...mockDeps, rollupsEnabled: false }
          )
          .toPromise();

        expect(mockApiCaller).toBeCalledTimes(0);
      });
    });

    describe('with sessionId', () => {
      it('Submit search with session id that is not saved creates a search with short keep_alive', async () => {
        mockSubmitCaller.mockResolvedValueOnce(mockAsyncResponse);

        const params = { index: 'logstash-*', body: { query: {} } };
        const esSearch = await enhancedEsSearchStrategyProvider(
          mockLegacyConfig$,
          mockSearchConfig,
          mockLogger
        );

        await esSearch.search({ params }, { sessionId: '1' }, mockDeps).toPromise();

        expect(mockSubmitCaller).toBeCalled();
        const request = mockSubmitCaller.mock.calls[0][0];
        expect(request.index).toEqual(params.index);
        expect(request.body).toEqual(params.body);

        expect(request).toHaveProperty('keep_alive', '60000ms');
      });

      it('Submit search with session id and session is saved creates a search with long keep_alive', async () => {
        mockSubmitCaller.mockResolvedValueOnce(mockAsyncResponse);

        const params = { index: 'logstash-*', body: { query: {} } };
        const esSearch = await enhancedEsSearchStrategyProvider(
          mockLegacyConfig$,
          mockSearchConfig,
          mockLogger
        );

        await esSearch.search({ params }, { sessionId: '1', isStored: true }, mockDeps).toPromise();

        expect(mockSubmitCaller).toBeCalled();
        const request = mockSubmitCaller.mock.calls[0][0];
        expect(request.index).toEqual(params.index);
        expect(request.body).toEqual(params.body);

        expect(request).toHaveProperty('keep_alive', '604800000ms');
      });

      it('makes a GET request to async search with short keepalive, if session is not saved', async () => {
        mockGetCaller.mockResolvedValueOnce(mockAsyncResponse);

        const params = { index: 'logstash-*', body: { query: {} } };
        const esSearch = await enhancedEsSearchStrategyProvider(
          mockLegacyConfig$,
          mockSearchConfig,
          mockLogger
        );

        await esSearch.search({ id: 'foo', params }, { sessionId: '1' }, mockDeps).toPromise();

        expect(mockGetCaller).toBeCalled();
        const request = mockGetCaller.mock.calls[0][0];
        expect(request.id).toEqual('foo');
        expect(request).toHaveProperty('wait_for_completion_timeout');
        expect(request).toHaveProperty('keep_alive', '60000ms');
      });

      it('makes a GET request to async search with long keepalive, if session is saved', async () => {
        mockGetCaller.mockResolvedValueOnce(mockAsyncResponse);

        const params = { index: 'logstash-*', body: { query: {} } };
        const esSearch = await enhancedEsSearchStrategyProvider(
          mockLegacyConfig$,
          mockSearchConfig,
          mockLogger
        );

        await esSearch
          .search({ id: 'foo', params }, { sessionId: '1', isStored: true }, mockDeps)
          .toPromise();

        expect(mockGetCaller).toBeCalled();
        const request = mockGetCaller.mock.calls[0][0];
        expect(request.id).toEqual('foo');
        expect(request).toHaveProperty('wait_for_completion_timeout');
        expect(request).toHaveProperty('keep_alive', '604800000ms');
      });

      it('makes a GET request to async search with no keepalive, if session is session saved and search is stored', async () => {
        mockGetCaller.mockResolvedValueOnce(mockAsyncResponse);

        const params = { index: 'logstash-*', body: { query: {} } };
        const esSearch = await enhancedEsSearchStrategyProvider(
          mockLegacyConfig$,
          mockSearchConfig,
          mockLogger
        );

        await esSearch
          .search(
            { id: 'foo', params },
            { sessionId: '1', isSearchStored: true, isStored: true },
            mockDeps
          )
          .toPromise();

        expect(mockGetCaller).toBeCalled();
        const request = mockGetCaller.mock.calls[0][0];
        expect(request.id).toEqual('foo');
        expect(request).toHaveProperty('wait_for_completion_timeout');
        expect(request).not.toHaveProperty('keep_alive');
      });
    });

    it('throws normalized error if ResponseError is thrown', async () => {
      const errResponse = new errors.ResponseError({
        body: indexNotFoundException,
        statusCode: 404,
        headers: {},
        warnings: [],
        meta: {} as any,
      });

      mockSubmitCaller.mockRejectedValue(errResponse);

      const params = { index: 'logstash-*', body: { query: {} } };
      const esSearch = await enhancedEsSearchStrategyProvider(
        mockLegacyConfig$,
        mockSearchConfig,
        mockLogger
      );

      let err: KbnSearchError | undefined;
      try {
        await esSearch.search({ params }, {}, mockDeps).toPromise();
      } catch (e) {
        err = e;
      }
      expect(mockSubmitCaller).toBeCalled();
      expect(err).toBeInstanceOf(KbnSearchError);
      expect(err?.statusCode).toBe(404);
      expect(err?.message).toBe(errResponse.message);
      expect(err?.errBody).toBe(indexNotFoundException);
    });

    it('throws normalized error if Error is thrown', async () => {
      const errResponse = new Error('not good');

      mockSubmitCaller.mockRejectedValue(errResponse);

      const params = { index: 'logstash-*', body: { query: {} } };
      const esSearch = await enhancedEsSearchStrategyProvider(
        mockLegacyConfig$,
        mockSearchConfig,
        mockLogger
      );

      let err: KbnSearchError | undefined;
      try {
        await esSearch.search({ params }, {}, mockDeps).toPromise();
      } catch (e) {
        err = e;
      }
      expect(mockSubmitCaller).toBeCalled();
      expect(err).toBeInstanceOf(KbnSearchError);
      expect(err?.statusCode).toBe(500);
      expect(err?.message).toBe(errResponse.message);
      expect(err?.errBody).toBe(undefined);
    });
  });

  describe('cancel', () => {
    it('makes a DELETE request to async search with the provided ID', async () => {
      mockDeleteCaller.mockResolvedValueOnce(200);

      const id = 'some_id';
      const esSearch = await enhancedEsSearchStrategyProvider(
        mockLegacyConfig$,
        mockSearchConfig,
        mockLogger
      );

      await esSearch.cancel!(id, {}, mockDeps);

      expect(mockDeleteCaller).toBeCalled();
      const request = mockDeleteCaller.mock.calls[0][0];
      expect(request).toEqual({ id });
    });

    it('throws normalized error on ResponseError', async () => {
      const errResponse = new errors.ResponseError({
        body: xContentParseException,
        statusCode: 400,
        headers: {},
        warnings: [],
        meta: {} as any,
      });
      mockDeleteCaller.mockRejectedValue(errResponse);

      const id = 'some_id';
      const esSearch = await enhancedEsSearchStrategyProvider(
        mockLegacyConfig$,
        mockSearchConfig,
        mockLogger
      );

      let err: KbnServerError | undefined;
      try {
        await esSearch.cancel!(id, {}, mockDeps);
      } catch (e) {
        err = e;
      }

      expect(mockDeleteCaller).toBeCalled();
      expect(err).toBeInstanceOf(KbnServerError);
      expect(err?.statusCode).toBe(400);
      expect(err?.message).toBe(errResponse.message);
      expect(err?.errBody).toBe(xContentParseException);
    });
  });

  describe('extend', () => {
    it('makes a GET request to async search with the provided ID and keepAlive', async () => {
      mockGetCaller.mockResolvedValueOnce(mockAsyncResponse);

      const id = 'some_other_id';
      const keepAlive = '1d';
      const esSearch = await enhancedEsSearchStrategyProvider(
        mockLegacyConfig$,
        mockSearchConfig,
        mockLogger
      );

      await esSearch.extend!(id, keepAlive, {}, mockDeps);

      expect(mockGetCaller).toBeCalled();
      const request = mockGetCaller.mock.calls[0][0];
      expect(request).toEqual({ id, keep_alive: keepAlive });
    });

    it('throws normalized error on ElasticsearchClientError', async () => {
      const errResponse = new errors.ElasticsearchClientError('something is wrong with EsClient');
      mockGetCaller.mockRejectedValue(errResponse);

      const id = 'some_other_id';
      const keepAlive = '1d';
      const esSearch = await enhancedEsSearchStrategyProvider(
        mockLegacyConfig$,
        mockSearchConfig,
        mockLogger
      );

      let err: KbnServerError | undefined;
      try {
        await esSearch.extend!(id, keepAlive, {}, mockDeps);
      } catch (e) {
        err = e;
      }

      expect(mockGetCaller).toBeCalled();
      expect(err).toBeInstanceOf(KbnServerError);
      expect(err?.statusCode).toBe(500);
      expect(err?.message).toBe(errResponse.message);
      expect(err?.errBody).toBe(undefined);
    });
  });
});
