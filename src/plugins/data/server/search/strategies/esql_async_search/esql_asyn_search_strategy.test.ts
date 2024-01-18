/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { firstValueFrom } from 'rxjs';
import { KbnServerError } from '@kbn/kibana-utils-plugin/server';
import { KbnSearchError } from '../../report_search_error';
import { errors } from '@elastic/elasticsearch';
import * as indexNotFoundException from '../../../../common/search/test_data/index_not_found_exception.json';
import * as xContentParseException from '../../../../common/search/test_data/x_content_parse_exception.json';
import { SearchStrategyDependencies } from '../../types';
import { esqlAsyncSearchStrategyProvider } from './esql_async_search_strategy';
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

describe.skip('ES|QL async search strategy', () => {
  const mockApiCaller = jest.fn();
  const mockLogger: any = {
    debug: () => {},
  };
  const mockDeps = {
    uiSettingsClient: {
      get: jest.fn(),
    },
    esClient: {
      asCurrentUser: {
        transport: { request: mockApiCaller },
      },
    },
  } as unknown as SearchStrategyDependencies;

  const mockSearchConfig = getMockSearchConfig({});

  beforeEach(() => {
    mockApiCaller.mockClear();
  });

  it('returns a strategy with `search and `cancel`', async () => {
    const esSearch = await esqlAsyncSearchStrategyProvider(mockSearchConfig, mockLogger);

    expect(typeof esSearch.search).toBe('function');
  });

  describe('search', () => {
    describe('no sessionId', () => {
      it('makes a POST request with params when no ID provided', async () => {
        mockApiCaller.mockResolvedValueOnce(mockAsyncResponse);

        const params = { index: 'logstash-*', body: { query: {} } };
        const esSearch = await esqlAsyncSearchStrategyProvider(mockSearchConfig, mockLogger);

        await esSearch.search({ id: undefined, params: {} }, {}, mockDeps).toPromise();

        expect(mockApiCaller).toBeCalled();
        const request = mockApiCaller.mock.calls[0][0];
        expect(request.index).toEqual(params.index);
        expect(request.body).toEqual(params.body);
        expect(request).toHaveProperty('keep_alive', '60000ms');
      });

      it('makes a GET request to async search with ID', async () => {
        mockApiCaller.mockResolvedValueOnce(mockAsyncResponse);

        const params = {};
        const esSearch = await esqlAsyncSearchStrategyProvider(mockSearchConfig, mockLogger);

        await esSearch.search({ id: 'foo', params }, {}, mockDeps).toPromise();

        expect(mockApiCaller).toBeCalled();
        const request = mockApiCaller.mock.calls[0][0];
        expect(request.id).toEqual('foo');
        expect(request).toHaveProperty('wait_for_completion_timeout');
        expect(request).toHaveProperty('keep_alive', '60000ms');
      });

      it('allows overriding keep_alive and wait_for_completion_timeout', async () => {
        mockApiCaller.mockResolvedValueOnce(mockAsyncResponse);

        const params = {
          index: 'logstash-*',
          body: { query: {} },
          wait_for_completion_timeout: '10s',
          keep_alive: '5m',
        };
        const esSearch = await esqlAsyncSearchStrategyProvider(mockSearchConfig, mockLogger);

        await esSearch.search({ id: 'foo', params }, {}, mockDeps).toPromise();

        expect(mockApiCaller).toBeCalled();
        const request = mockApiCaller.mock.calls[0][0];
        expect(request.id).toEqual('foo');
        expect(request).toHaveProperty('wait_for_completion_timeout', '10s');
        expect(request).toHaveProperty('keep_alive', '5m');
      });

      it('sets transport options on POST requests', async () => {
        const transportOptions = { maxRetries: 1 };
        mockApiCaller.mockResolvedValueOnce(mockAsyncResponse);
        const params = {};
        const esSearch = esqlAsyncSearchStrategyProvider(mockSearchConfig, mockLogger);

        await firstValueFrom(
          esSearch.search({ params }, { transport: transportOptions }, mockDeps)
        );

        expect(mockApiCaller).toHaveBeenNthCalledWith(
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
        mockApiCaller.mockResolvedValueOnce(mockAsyncResponse);
        const params = {};
        const esSearch = esqlAsyncSearchStrategyProvider(mockSearchConfig, mockLogger);

        await firstValueFrom(
          esSearch.search({ id: 'foo', params }, { transport: { maxRetries: 1 } }, mockDeps)
        );

        expect(mockApiCaller).toHaveBeenNthCalledWith(
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
        mockApiCaller.mockResolvedValueOnce(mockAsyncResponse);

        const params = {};
        const esSearch = await esqlAsyncSearchStrategyProvider(mockSearchConfig, mockLogger);

        await esSearch.search({ params }, {}, mockDeps).toPromise();

        expect(mockApiCaller).toBeCalled();
        const request = mockApiCaller.mock.calls[0][0];
        expect(request).toHaveProperty('wait_for_completion_timeout');
        expect(request).toHaveProperty('keep_alive');
      });

      it('should delete when aborted', async () => {
        mockApiCaller.mockResolvedValueOnce({
          ...mockAsyncResponse,
          body: {
            ...mockAsyncResponse.body,
            is_running: true,
          },
        });

        const params = {};
        const esSearch = await esqlAsyncSearchStrategyProvider(mockSearchConfig, mockLogger);
        const abortController = new AbortController();
        const abortSignal = abortController.signal;

        // Abort after an incomplete first response is returned
        setTimeout(() => abortController.abort(), 100);

        let err: KbnServerError | undefined;
        try {
          await esSearch.search({ params }, { abortSignal }, mockDeps).toPromise();
        } catch (e) {
          err = e;
        }
        expect(mockApiCaller).toBeCalled();
        expect(err).not.toBeUndefined();
        expect(mockApiCaller).toBeCalled();
      });
    });

    describe('with sessionId', () => {
      it('Submit search with session id that is not saved creates a search with short keep_alive', async () => {
        mockApiCaller.mockResolvedValueOnce(mockAsyncResponse);

        const params = {};
        const esSearch = await esqlAsyncSearchStrategyProvider(mockSearchConfig, mockLogger);

        await esSearch.search({ params }, { sessionId: '1' }, mockDeps).toPromise();

        expect(mockApiCaller).toBeCalled();
        const request = mockApiCaller.mock.calls[0][0];
        // expect(request.index).toEqual(params.index);
        // expect(request.body).toEqual(params.body);

        expect(request).toHaveProperty('keep_alive', '60000ms');
      });

      it('Submit search with session id and session is saved creates a search with long keep_alive', async () => {
        mockApiCaller.mockResolvedValueOnce(mockAsyncResponse);

        const params = {};
        const esSearch = await esqlAsyncSearchStrategyProvider(mockSearchConfig, mockLogger);

        await esSearch.search({ params }, { sessionId: '1', isStored: true }, mockDeps).toPromise();

        expect(mockApiCaller).toBeCalled();
        const request = mockApiCaller.mock.calls[0][0];
        // expect(request.index).toEqual(params.index);
        // expect(request.body).toEqual(params.body);

        expect(request).toHaveProperty('keep_alive', '604800000ms');
      });

      it('makes a GET request to async search with short keepalive, if session is not saved', async () => {
        mockApiCaller.mockResolvedValueOnce(mockAsyncResponse);

        const params = {};
        const esSearch = await esqlAsyncSearchStrategyProvider(mockSearchConfig, mockLogger);

        await esSearch.search({ id: 'foo', params }, { sessionId: '1' }, mockDeps).toPromise();

        expect(mockApiCaller).toBeCalled();
        const request = mockApiCaller.mock.calls[0][0];
        expect(request.id).toEqual('foo');
        expect(request).toHaveProperty('wait_for_completion_timeout');
        expect(request).toHaveProperty('keep_alive', '60000ms');
      });

      it('makes a GET request to async search with long keepalive, if session is saved', async () => {
        mockApiCaller.mockResolvedValueOnce(mockAsyncResponse);

        const params = {};
        const esSearch = await esqlAsyncSearchStrategyProvider(mockSearchConfig, mockLogger);

        await esSearch
          .search({ id: 'foo', params }, { sessionId: '1', isStored: true }, mockDeps)
          .toPromise();

        expect(mockApiCaller).toBeCalled();
        const request = mockApiCaller.mock.calls[0][0];
        expect(request.id).toEqual('foo');
        expect(request).toHaveProperty('wait_for_completion_timeout');
        expect(request).toHaveProperty('keep_alive', '604800000ms');
      });

      it('makes a GET request to async search with no keepalive, if session is session saved and search is stored', async () => {
        mockApiCaller.mockResolvedValueOnce(mockAsyncResponse);

        const params = {};
        const esSearch = await esqlAsyncSearchStrategyProvider(mockSearchConfig, mockLogger);

        await esSearch
          .search(
            { id: 'foo', params },
            { sessionId: '1', isSearchStored: true, isStored: true },
            mockDeps
          )
          .toPromise();

        expect(mockApiCaller).toBeCalled();
        const request = mockApiCaller.mock.calls[0][0];
        expect(request.id).toEqual('foo');
        expect(request).toHaveProperty('wait_for_completion_timeout');
        expect(request).not.toHaveProperty('keep_alive');
      });

      it('should not delete a saved session when aborted', async () => {
        mockApiCaller.mockResolvedValueOnce({
          ...mockAsyncResponse,
          body: {
            ...mockAsyncResponse.body,
            is_running: true,
          },
        });

        const params = {};
        const esSearch = await esqlAsyncSearchStrategyProvider(mockSearchConfig, mockLogger);
        const abortController = new AbortController();
        const abortSignal = abortController.signal;

        // Abort after an incomplete first response is returned
        setTimeout(() => abortController.abort(), 100);

        let err: KbnServerError | undefined;
        try {
          await esSearch
            .search(
              { params },
              { abortSignal, sessionId: '1', isSearchStored: true, isStored: true },
              mockDeps
            )
            .toPromise();
        } catch (e) {
          err = e;
        }
        expect(mockApiCaller).toBeCalled();
        expect(err).not.toBeUndefined();
        expect(mockApiCaller).not.toBeCalled();
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

      mockApiCaller.mockRejectedValue(errResponse);

      const params = {};
      const esSearch = await esqlAsyncSearchStrategyProvider(mockSearchConfig, mockLogger);

      let err: KbnSearchError | undefined;
      try {
        await esSearch.search({ params }, {}, mockDeps).toPromise();
      } catch (e) {
        err = e;
      }
      expect(mockApiCaller).toBeCalled();
      expect(err).toBeInstanceOf(KbnSearchError);
      expect(err?.statusCode).toBe(404);
      expect(err?.message).toBe(errResponse.message);
      expect(err?.errBody).toBe(indexNotFoundException);
    });

    it('throws normalized error if Error is thrown', async () => {
      const errResponse = new Error('not good');

      mockApiCaller.mockRejectedValue(errResponse);

      const params = {};
      const esSearch = await esqlAsyncSearchStrategyProvider(mockSearchConfig, mockLogger);

      let err: KbnSearchError | undefined;
      try {
        await esSearch.search({ params }, {}, mockDeps).toPromise();
      } catch (e) {
        err = e;
      }
      expect(mockApiCaller).toBeCalled();
      expect(err).toBeInstanceOf(KbnSearchError);
      expect(err?.statusCode).toBe(500);
      expect(err?.message).toBe(errResponse.message);
      expect(err?.errBody).toBe(undefined);
    });
  });

  describe('cancel', () => {
    it('makes a DELETE request to async search with the provided ID', async () => {
      mockApiCaller.mockResolvedValueOnce(200);

      const id = 'some_id';
      const esSearch = await esqlAsyncSearchStrategyProvider(mockSearchConfig, mockLogger);

      await esSearch.cancel!(id, {}, mockDeps);

      expect(mockApiCaller).toBeCalled();
      const request = mockApiCaller.mock.calls[0][0];
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
      mockApiCaller.mockRejectedValue(errResponse);

      const id = 'some_id';
      const esSearch = await esqlAsyncSearchStrategyProvider(mockSearchConfig, mockLogger);

      let err: KbnServerError | undefined;
      try {
        await esSearch.cancel!(id, {}, mockDeps);
      } catch (e) {
        err = e;
      }

      expect(mockApiCaller).toBeCalled();
      expect(err).toBeInstanceOf(KbnServerError);
      expect(err?.statusCode).toBe(400);
      expect(err?.message).toBe(errResponse.message);
      expect(err?.errBody).toBe(xContentParseException);
    });
  });

  describe('extend', () => {
    it('makes a GET request to async search with the provided ID and keepAlive', async () => {
      mockApiCaller.mockResolvedValueOnce(mockAsyncResponse);

      const id = 'some_other_id';
      const keepAlive = '1d';
      const esSearch = await esqlAsyncSearchStrategyProvider(mockSearchConfig, mockLogger);

      await esSearch.extend!(id, keepAlive, {}, mockDeps);

      expect(mockApiCaller).toBeCalled();
      const request = mockApiCaller.mock.calls[0][0];
      expect(request).toEqual({ id, keep_alive: keepAlive });
    });

    it('throws normalized error on ElasticsearchClientError', async () => {
      const errResponse = new errors.ElasticsearchClientError('something is wrong with EsClient');
      mockApiCaller.mockRejectedValue(errResponse);

      const id = 'some_other_id';
      const keepAlive = '1d';
      const esSearch = await esqlAsyncSearchStrategyProvider(mockSearchConfig, mockLogger);

      let err: KbnServerError | undefined;
      try {
        await esSearch.extend!(id, keepAlive, {}, mockDeps);
      } catch (e) {
        err = e;
      }

      expect(mockApiCaller).toBeCalled();
      expect(err).toBeInstanceOf(KbnServerError);
      expect(err?.statusCode).toBe(500);
      expect(err?.message).toBe(errResponse.message);
      expect(err?.errBody).toBe(undefined);
    });
  });
});
