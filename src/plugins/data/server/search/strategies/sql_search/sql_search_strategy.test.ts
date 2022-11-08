/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { merge } from 'lodash';
import { KbnServerError } from '@kbn/kibana-utils-plugin/server';
import { errors } from '@elastic/elasticsearch';
import * as indexNotFoundException from '../../../../common/search/test_data/index_not_found_exception.json';
import { SearchStrategyDependencies } from '../../types';
import { sqlSearchStrategyProvider } from './sql_search_strategy';
import { createSearchSessionsClientMock } from '../../mocks';
import { SqlSearchStrategyRequest } from '../../../../common';
import { getMockSearchConfig } from '../../../../config.mock';

const mockSqlResponse = {
  body: {
    id: 'foo',
    is_partial: false,
    is_running: false,
    rows: [],
  },
};

describe('SQL search strategy', () => {
  const mockSqlGetAsync = jest.fn();
  const mockSqlQuery = jest.fn();
  const mockSqlDelete = jest.fn();
  const mockSqlClearCursor = jest.fn();
  const mockLogger: any = {
    debug: () => {},
  };
  const mockDeps = {
    esClient: {
      asCurrentUser: {
        sql: {
          getAsync: mockSqlGetAsync,
          query: mockSqlQuery,
          deleteAsync: mockSqlDelete,
          clearCursor: mockSqlClearCursor,
        },
      },
    },
    searchSessionsClient: createSearchSessionsClientMock(),
  } as unknown as SearchStrategyDependencies;

  const mockSearchConfig = getMockSearchConfig({});

  beforeEach(() => {
    mockSqlGetAsync.mockClear();
    mockSqlQuery.mockClear();
    mockSqlDelete.mockClear();
    mockSqlClearCursor.mockClear();
  });

  it('returns a strategy with `search and `cancel`, `extend`', async () => {
    const esSearch = await sqlSearchStrategyProvider(mockSearchConfig, mockLogger);

    expect(typeof esSearch.search).toBe('function');
    expect(typeof esSearch.cancel).toBe('function');
    expect(typeof esSearch.extend).toBe('function');
  });

  describe('search', () => {
    describe('no sessionId', () => {
      it('makes a POST request with params when no ID provided', async () => {
        mockSqlQuery.mockResolvedValueOnce(mockSqlResponse);

        const params: SqlSearchStrategyRequest['params'] = {
          query:
            'SELECT customer_first_name FROM kibana_sample_data_ecommerce ORDER BY order_date DESC',
        };
        const esSearch = await sqlSearchStrategyProvider(mockSearchConfig, mockLogger);

        await esSearch
          .search({ params }, { transport: { requestTimeout: 30000 } }, mockDeps)
          .toPromise();

        expect(mockSqlQuery).toBeCalled();
        const [request, searchOptions] = mockSqlQuery.mock.calls[0];
        expect(request).toEqual({
          format: 'json',
          keep_alive: '60000ms',
          keep_on_completion: false,
          query:
            'SELECT customer_first_name FROM kibana_sample_data_ecommerce ORDER BY order_date DESC',
          wait_for_completion_timeout: '100ms',
        });
        expect(searchOptions).toEqual({
          meta: true,
          requestTimeout: 30000,
          signal: undefined,
        });
      });

      it('makes a GET request to async search with ID', async () => {
        mockSqlGetAsync.mockResolvedValueOnce(mockSqlResponse);

        const params: SqlSearchStrategyRequest['params'] = {
          query:
            'SELECT customer_first_name FROM kibana_sample_data_ecommerce ORDER BY order_date DESC',
        };

        const esSearch = await sqlSearchStrategyProvider(mockSearchConfig, mockLogger);

        await esSearch
          .search({ id: 'foo', params }, { transport: { requestTimeout: 30000 } }, mockDeps)
          .toPromise();

        expect(mockSqlGetAsync).toBeCalled();
        const [request, searchOptions] = mockSqlGetAsync.mock.calls[0];
        expect(request).toEqual({
          format: 'json',
          id: 'foo',
          keep_alive: '60000ms',
          wait_for_completion_timeout: '100ms',
        });
        expect(searchOptions).toEqual({
          meta: true,
          requestTimeout: 30000,
          signal: undefined,
        });
      });
    });

    // skip until full search session support https://github.com/elastic/kibana/issues/127880
    describe.skip('with sessionId', () => {
      it('makes a POST request with params (long keepalive)', async () => {
        mockSqlQuery.mockResolvedValueOnce(mockSqlResponse);
        const params: SqlSearchStrategyRequest['params'] = {
          query:
            'SELECT customer_first_name FROM kibana_sample_data_ecommerce ORDER BY order_date DESC',
        };
        const esSearch = await sqlSearchStrategyProvider(mockSearchConfig, mockLogger);

        await esSearch.search({ params }, { sessionId: '1' }, mockDeps).toPromise();

        expect(mockSqlQuery).toBeCalled();
        const request = mockSqlQuery.mock.calls[0][0];
        expect(request.query).toEqual(params.query);

        expect(request).toHaveProperty('keep_alive', '604800000ms');
      });

      it('makes a GET request to async search without keepalive', async () => {
        mockSqlGetAsync.mockResolvedValueOnce(mockSqlResponse);

        const params: SqlSearchStrategyRequest['params'] = {
          query:
            'SELECT customer_first_name FROM kibana_sample_data_ecommerce ORDER BY order_date DESC',
        };

        const esSearch = await sqlSearchStrategyProvider(mockSearchConfig, mockLogger);

        await esSearch.search({ id: 'foo', params }, { sessionId: '1' }, mockDeps).toPromise();

        expect(mockSqlGetAsync).toBeCalled();
        const request = mockSqlGetAsync.mock.calls[0][0];
        expect(request.id).toEqual('foo');
        expect(request).toHaveProperty('wait_for_completion_timeout');
        expect(request).not.toHaveProperty('keep_alive');
      });
    });

    describe('with sessionId (until SQL ignores session Id)', () => {
      it('makes a POST request with params (long keepalive)', async () => {
        mockSqlQuery.mockResolvedValueOnce(mockSqlResponse);
        const params: SqlSearchStrategyRequest['params'] = {
          query:
            'SELECT customer_first_name FROM kibana_sample_data_ecommerce ORDER BY order_date DESC',
        };
        const esSearch = await sqlSearchStrategyProvider(mockSearchConfig, mockLogger);

        await esSearch.search({ params }, { sessionId: '1' }, mockDeps).toPromise();

        expect(mockSqlQuery).toBeCalled();
        const request = mockSqlQuery.mock.calls[0][0];
        expect(request.query).toEqual(params.query);

        expect(request).toHaveProperty('wait_for_completion_timeout');
        expect(request).toHaveProperty('keep_alive', '60000ms');
      });

      it('makes a GET request to async search with keepalive', async () => {
        mockSqlGetAsync.mockResolvedValueOnce(mockSqlResponse);

        const params: SqlSearchStrategyRequest['params'] = {
          query:
            'SELECT customer_first_name FROM kibana_sample_data_ecommerce ORDER BY order_date DESC',
        };

        const esSearch = await sqlSearchStrategyProvider(mockSearchConfig, mockLogger);

        await esSearch.search({ id: 'foo', params }, { sessionId: '1' }, mockDeps).toPromise();

        expect(mockSqlGetAsync).toBeCalled();
        const request = mockSqlGetAsync.mock.calls[0][0];
        expect(request.id).toEqual('foo');
        expect(request).toHaveProperty('wait_for_completion_timeout');
        expect(request).toHaveProperty('keep_alive', '60000ms');
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

      mockSqlQuery.mockRejectedValue(errResponse);

      const params: SqlSearchStrategyRequest['params'] = {
        query:
          'SELECT customer_first_name FROM kibana_sample_data_ecommerce ORDER BY order_date DESC',
      };
      const esSearch = await sqlSearchStrategyProvider(mockSearchConfig, mockLogger);

      let err: KbnServerError | undefined;
      try {
        await esSearch.search({ params }, {}, mockDeps).toPromise();
      } catch (e) {
        err = e;
      }
      expect(mockSqlQuery).toBeCalled();
      expect(err).toBeInstanceOf(KbnServerError);
      expect(err?.statusCode).toBe(404);
      expect(err?.message).toBe(errResponse.message);
      expect(err?.errBody).toBe(indexNotFoundException);
    });

    it('throws normalized error if Error is thrown', async () => {
      const errResponse = new Error('not good');

      mockSqlQuery.mockRejectedValue(errResponse);

      const params: SqlSearchStrategyRequest['params'] = {
        query:
          'SELECT customer_first_name FROM kibana_sample_data_ecommerce ORDER BY order_date DESC',
      };
      const esSearch = await sqlSearchStrategyProvider(mockSearchConfig, mockLogger);

      let err: KbnServerError | undefined;
      try {
        await esSearch.search({ params }, {}, mockDeps).toPromise();
      } catch (e) {
        err = e;
      }
      expect(mockSqlQuery).toBeCalled();
      expect(err).toBeInstanceOf(KbnServerError);
      expect(err?.statusCode).toBe(500);
      expect(err?.message).toBe(errResponse.message);
      expect(err?.errBody).toBe(undefined);
    });

    it('does not close the cursor if the search is incomplete', async () => {
      mockSqlGetAsync.mockResolvedValueOnce(
        merge({}, mockSqlResponse, {
          body: { is_partial: false, is_running: true, cursor: 'cursor' },
        })
      );

      const esSearch = await sqlSearchStrategyProvider(mockSearchConfig, mockLogger);
      await esSearch.search({ id: 'foo', params: { query: 'query' } }, {}, mockDeps).toPromise();

      expect(mockSqlClearCursor).not.toHaveBeenCalled();
    });

    it('does not close the cursor if there is a request parameter to keep it', async () => {
      mockSqlGetAsync.mockResolvedValueOnce(
        merge({}, mockSqlResponse, { body: { cursor: 'cursor' } })
      );

      const esSearch = await sqlSearchStrategyProvider(mockSearchConfig, mockLogger);
      await esSearch
        .search({ id: 'foo', params: { query: 'query', keep_cursor: true } }, {}, mockDeps)
        .toPromise();

      expect(mockSqlClearCursor).not.toHaveBeenCalled();
    });

    it('closes the cursor when the search is complete', async () => {
      mockSqlGetAsync.mockResolvedValueOnce(
        merge({}, mockSqlResponse, { body: { cursor: 'cursor' } })
      );

      const esSearch = await sqlSearchStrategyProvider(mockSearchConfig, mockLogger);
      await esSearch.search({ id: 'foo', params: { query: 'query' } }, {}, mockDeps).toPromise();

      expect(mockSqlClearCursor).toHaveBeenCalledWith({ cursor: 'cursor' });
    });

    it('returns the time it took to run a search', async () => {
      mockSqlGetAsync.mockResolvedValueOnce(mockSqlResponse);

      const esSearch = await sqlSearchStrategyProvider(mockSearchConfig, mockLogger);
      await expect(
        esSearch.search({ id: 'foo', params: { query: 'query' } }, {}, mockDeps).toPromise()
      ).resolves.toHaveProperty('took', expect.any(Number));
    });
  });

  describe('cancel', () => {
    it('makes a DELETE request to async search with the provided ID', async () => {
      mockSqlDelete.mockResolvedValueOnce(200);

      const id = 'some_id';
      const esSearch = await sqlSearchStrategyProvider(mockSearchConfig, mockLogger);

      await esSearch.cancel!(id, {}, mockDeps);

      expect(mockSqlDelete).toBeCalled();
      const request = mockSqlDelete.mock.calls[0][0];
      expect(request).toEqual({ id });
    });
  });

  describe('extend', () => {
    it('makes a GET request to async search with the provided ID and keepAlive', async () => {
      mockSqlGetAsync.mockResolvedValueOnce(mockSqlResponse);

      const id = 'some_other_id';
      const keepAlive = '1d';
      const esSearch = await sqlSearchStrategyProvider(mockSearchConfig, mockLogger);
      await esSearch.extend!(id, keepAlive, {}, mockDeps);

      expect(mockSqlGetAsync).toBeCalled();
      const request = mockSqlGetAsync.mock.calls[0][0];
      expect(request).toEqual({ id, keep_alive: keepAlive });
    });
  });
});
