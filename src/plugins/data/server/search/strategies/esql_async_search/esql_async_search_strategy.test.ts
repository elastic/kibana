/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom } from 'rxjs';
import { KbnServerError } from '@kbn/kibana-utils-plugin/server';
import { KbnSearchError } from '../../report_search_error';
import { errors } from '@elastic/elasticsearch';
import indexNotFoundException from '../../../../common/search/test_data/index_not_found_exception.json';
import xContentParseException from '../../../../common/search/test_data/x_content_parse_exception.json';
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

describe('ES|QL async search strategy', () => {
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

        const esSearch = await esqlAsyncSearchStrategyProvider(mockSearchConfig, mockLogger);
        const params = {
          query: 'from logs* | limit 10',
        };
        await esSearch
          .search(
            {
              id: undefined,
              params,
            },
            {},
            mockDeps
          )
          .toPromise();

        expect(mockApiCaller).toBeCalled();
        const request = mockApiCaller.mock.calls[0][0].body;
        expect(request.query).toEqual(params.query);
        expect(request).toHaveProperty('keep_alive', '60000ms');
      });

      it('makes a GET request to async search with ID', async () => {
        mockApiCaller.mockResolvedValueOnce(mockAsyncResponse);

        const params = {
          query: 'from logs* | limit 10',
        };
        const esSearch = await esqlAsyncSearchStrategyProvider(mockSearchConfig, mockLogger);

        await esSearch.search({ id: 'foo', params }, {}, mockDeps).toPromise();

        expect(mockApiCaller).toBeCalled();
        const request = mockApiCaller.mock.calls[0][0];
        expect(request.path).toContain('foo');
        expect(request.querystring).toHaveProperty('wait_for_completion_timeout');
        expect(request.querystring).toHaveProperty('keep_alive', '60000ms');
      });

      it('allows overriding keep_alive and wait_for_completion_timeout', async () => {
        mockApiCaller.mockResolvedValueOnce(mockAsyncResponse);

        const params = {
          query: 'from logs* | limit 10',
          wait_for_completion_timeout: '10s',
          keep_alive: '5m',
        };
        const esSearch = await esqlAsyncSearchStrategyProvider(mockSearchConfig, mockLogger);

        await esSearch.search({ id: 'foo', params }, {}, mockDeps).toPromise();

        expect(mockApiCaller).toBeCalled();
        const request = mockApiCaller.mock.calls[0][0];
        expect(request.path).toContain('foo');
        expect(request.querystring).toHaveProperty('wait_for_completion_timeout', '10s');
        expect(request.querystring).toHaveProperty('keep_alive', '5m');
      });

      it('sets transport options on POST requests', async () => {
        const transportOptions = { maxRetries: 1 };
        mockApiCaller.mockResolvedValueOnce(mockAsyncResponse);
        const params = { query: 'from logs' };
        const esSearch = esqlAsyncSearchStrategyProvider(mockSearchConfig, mockLogger);

        await firstValueFrom(
          esSearch.search({ params }, { transport: transportOptions }, mockDeps)
        );

        expect(mockApiCaller).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            method: 'POST',
            path: '/_query/async',
            body: {
              keep_alive: '60000ms',
              wait_for_completion_timeout: '100ms',
              keep_on_completion: false,
              query: 'from logs',
            },
          }),
          expect.objectContaining({ maxRetries: 1, meta: true, signal: undefined })
        );
      });

      it('sets transport options on GET requests', async () => {
        mockApiCaller.mockResolvedValueOnce(mockAsyncResponse);
        const params = {
          query: 'from logs* | limit 10',
        };
        const esSearch = esqlAsyncSearchStrategyProvider(mockSearchConfig, mockLogger);

        await firstValueFrom(
          esSearch.search({ id: 'foo', params }, { transport: { maxRetries: 1 } }, mockDeps)
        );

        expect(mockApiCaller).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            path: '/_query/async/foo',
            querystring: {
              keep_alive: '60000ms',
              wait_for_completion_timeout: '100ms',
            },
          }),
          expect.objectContaining({ maxRetries: 1, meta: true, signal: undefined })
        );
      });

      it('sets wait_for_completion_timeout and keep_alive in the request', async () => {
        mockApiCaller.mockResolvedValueOnce(mockAsyncResponse);

        const params = {
          query: 'from logs* | limit 10',
        };
        const esSearch = await esqlAsyncSearchStrategyProvider(mockSearchConfig, mockLogger);

        await esSearch.search({ params }, {}, mockDeps).toPromise();

        expect(mockApiCaller).toBeCalled();
        const request = mockApiCaller.mock.calls[0][0].body;
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

        const params = {
          query: 'from logs* | limit 10',
        };
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

    it('throws normalized error if ResponseError is thrown', async () => {
      const errResponse = new errors.ResponseError({
        body: indexNotFoundException,
        statusCode: 404,
        headers: {},
        warnings: [],
        meta: {} as any,
      });

      mockApiCaller.mockRejectedValue(errResponse);

      const params = {
        query: 'from logs* | limit 10',
      };
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
      expect(err?.errBody).toEqual(indexNotFoundException);
    });

    it('throws normalized error if Error is thrown', async () => {
      const errResponse = new Error('not good');

      mockApiCaller.mockRejectedValue(errResponse);

      const params = {
        query: 'from logs* | limit 10',
      };
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
      expect(request.path).toContain(id);
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
      expect(err?.errBody).toEqual(xContentParseException);
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
      expect(request.body).toEqual({ id, keep_alive: keepAlive });
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
