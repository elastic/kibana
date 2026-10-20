/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { of } from 'rxjs';
import { SearchMethodsService } from './search_methods';
import type { ISearchGeneric } from '@kbn/search-types';
import type { AbstractDataView } from '@kbn/data-views-plugin/common';

describe('SearchMethodsService', () => {
  let mockSearch: jest.MockedFunction<ISearchGeneric>;
  let service: SearchMethodsService;

  beforeEach(() => {
    mockSearch = jest.fn();
    service = new SearchMethodsService(mockSearch);
  });

  const createMockResponse = (rawResponse: object, isRunning = false) => {
    return of({
      isRunning,
      rawResponse,
    });
  };

  describe('esql', () => {
    it('executes with correct strategy', async () => {
      const mockResponse = { columns: [], values: [] };
      mockSearch.mockReturnValue(createMockResponse(mockResponse));

      await service.esql({ query: 'FROM logs' });

      expect(mockSearch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          strategy: 'esql_async',
        })
      );
    });

    it('maps params correctly', async () => {
      const mockResponse = { columns: [], values: [] };
      mockSearch.mockReturnValue(createMockResponse(mockResponse));

      const params = {
        query: 'FROM logs | WHERE status > ?foo',
        params: [{ name: 'foo', value: 200 }],
        filter: { term: { field: 'value' } },
        timeZone: 'UTC',
        locale: 'en-US',
      };

      await service.esql(params);

      expect(mockSearch).toHaveBeenCalledWith(
        {
          params: {
            query: params.query,
            params: params.params,
            filter: params.filter,
            time_zone: params.timeZone,
            locale: params.locale,
            dropNullColumns: undefined,
            include_execution_metadata: undefined,
          },
        },
        expect.anything()
      );
    });

    it('passes options correctly', async () => {
      const mockResponse = { columns: [], values: [] };
      mockSearch.mockReturnValue(createMockResponse(mockResponse));

      const abortController = new AbortController();
      const options = {
        abortSignal: abortController.signal,
        sessionId: 'test-session',
        executionContext: { type: 'test' as const, name: 'test' },
        projectRouting: 'test-project',
      };

      await service.esql({ query: 'FROM logs' }, options);

      expect(mockSearch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          abortSignal: options.abortSignal,
          sessionId: options.sessionId,
          executionContext: options.executionContext,
          projectRouting: options.projectRouting,
        })
      );
    });

    it('requests column_metadata when columnMetadata option is true', async () => {
      const mockResponse = { columns: [], values: [] };
      mockSearch.mockReturnValue(createMockResponse(mockResponse));

      await service.esql({ query: 'FROM logs' }, { columnMetadata: true });

      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            settings: { column_metadata: true },
          }),
        }),
        expect.anything()
      );
    });

    it('omits settings when columnMetadata option is not set', async () => {
      const mockResponse = { columns: [], values: [] };
      mockSearch.mockReturnValue(createMockResponse(mockResponse));

      await service.esql({ query: 'FROM logs' });

      const [{ params }] = mockSearch.mock.calls[0];
      expect(params).not.toHaveProperty('settings');
    });

    it('returns rawResponse', async () => {
      const mockResponse = { columns: [], values: [] };
      mockSearch.mockReturnValue(createMockResponse(mockResponse));

      const result = await service.esql({ query: 'FROM logs' });

      expect(result).toEqual({ rawResponse: mockResponse });
    });
  });

  describe('dsl', () => {
    it('executes with correct strategy', async () => {
      const mockResponse = { hits: { hits: [], total: 0 } };
      mockSearch.mockReturnValue(createMockResponse(mockResponse));

      await service.dsl({
        index: 'logs-*',
        query: { match_all: {} },
      });

      expect(mockSearch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          strategy: 'ese',
        })
      );
    });

    it('maps params correctly', async () => {
      const mockResponse = { hits: { hits: [], total: 0 } };
      mockSearch.mockReturnValue(createMockResponse(mockResponse));

      const params = {
        index: 'logs-*',
        query: { match: { message: 'error' } },
        aggs: { status_count: { terms: { field: 'status' } } },
        size: 50,
        sort: [{ timestamp: 'desc' }],
        fields: ['timestamp', 'message'],
        _source: false,
        runtimeMappings: { runtime_field: { type: 'keyword' as const } },
        highlight: { fields: { message: {} } },
      };

      await service.dsl(params);

      expect(mockSearch).toHaveBeenCalledWith(
        {
          params: {
            index: params.index,
            body: {
              query: params.query,
              aggs: params.aggs,
              size: params.size,
              sort: params.sort,
              fields: params.fields,
              _source: params._source,
              runtime_mappings: params.runtimeMappings,
              highlight: params.highlight,
            },
          },
        },
        expect.anything()
      );
    });

    it('accepts data view as index', async () => {
      const mockResponse = { hits: { hits: [], total: 0 } };
      mockSearch.mockReturnValue(createMockResponse(mockResponse));

      const mockDataView = {
        id: '1',
        getIndexPattern: () => 'logs-*',
      } as AbstractDataView;

      await service.dsl({
        index: mockDataView,
        query: { match_all: {} },
      });

      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            index: 'logs-*',
          }),
        }),
        expect.objectContaining({
          indexPattern: mockDataView,
        })
      );
    });
  });

  describe('dslPaginated', () => {
    it('returns pagination object', async () => {
      const mockResponse = {
        hits: {
          hits: [
            { _id: '1', _source: { message: 'test' }, sort: [1000] },
            { _id: '2', _source: { message: 'test2' }, sort: [2000] },
          ],
          total: { value: 100 },
        },
      };
      mockSearch.mockReturnValue(createMockResponse(mockResponse));

      const result = await service.dslPaginated({
        index: 'logs-*',
        query: { match_all: {} },
        sort: [{ timestamp: 'desc' }],
      });

      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            body: expect.objectContaining({
              track_total_hits: true,
            }),
          }),
        }),
        expect.anything()
      );

      expect(result.pagination).toBeDefined();
      expect(result.pagination.hasNextPage).toBeDefined();
      expect(result.pagination.nextPage).toBeDefined();
    });

    it('hasNextPage is true when hits remain', async () => {
      const mockResponse = {
        hits: {
          hits: [
            { _id: '1', _source: { message: 'test' }, sort: [1000] },
            { _id: '2', _source: { message: 'test2' }, sort: [2000] },
          ],
          total: { value: 100 },
        },
      };
      mockSearch.mockReturnValue(createMockResponse(mockResponse));

      const result = await service.dslPaginated({
        index: 'logs-*',
        query: { match_all: {} },
        sort: [{ timestamp: 'desc' }],
      });

      expect(result.pagination.hasNextPage).toBe(true);
    });

    it('hasNextPage is false when no more results', async () => {
      const mockResponse = {
        hits: {
          hits: [
            { _id: '1', _source: { message: 'test' }, sort: [1000] },
            { _id: '2', _source: { message: 'test2' }, sort: [2000] },
          ],
          total: { value: 2 },
        },
      };
      mockSearch.mockReturnValue(createMockResponse(mockResponse));

      const result = await service.dslPaginated({
        index: 'logs-*',
        query: { match_all: {} },
        sort: [{ timestamp: 'desc' }],
      });

      expect(result.pagination.hasNextPage).toBe(false);
    });

    it('hasNextPage is false when no sort values', async () => {
      const mockResponse = {
        hits: {
          hits: [
            { _id: '1', _source: { message: 'test' } },
            { _id: '2', _source: { message: 'test2' } },
          ],
          total: { value: 100 },
        },
      };
      mockSearch.mockReturnValue(createMockResponse(mockResponse));

      const result = await service.dslPaginated({
        index: 'logs-*',
        query: { match_all: {} },
      });

      expect(result.pagination.hasNextPage).toBe(false);
    });

    it('nextPage() uses search_after from last hit sort', async () => {
      const firstPageResponse = {
        hits: {
          hits: [
            { _id: '1', _source: { message: 'test' }, sort: [1000] },
            { _id: '2', _source: { message: 'test2' }, sort: [2000] },
          ],
          total: { value: 100 },
        },
      };

      const secondPageResponse = {
        hits: {
          hits: [
            { _id: '3', _source: { message: 'test3' }, sort: [3000] },
            { _id: '4', _source: { message: 'test4' }, sort: [4000] },
          ],
          total: { value: 100 },
        },
      };

      mockSearch
        .mockReturnValueOnce(createMockResponse(firstPageResponse))
        .mockReturnValueOnce(createMockResponse(secondPageResponse));

      const result = await service.dslPaginated({
        index: 'logs-*',
        query: { match_all: {} },
        sort: [{ timestamp: 'desc' }],
      });

      await result.pagination.nextPage();

      expect(mockSearch).toHaveBeenCalledTimes(2);
      expect(mockSearch).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          params: expect.objectContaining({
            body: expect.objectContaining({
              search_after: [2000],
            }),
          }),
        }),
        expect.anything()
      );
    });

    it('nextPage() returns null when no more pages', async () => {
      const mockResponse = {
        hits: {
          hits: [
            { _id: '1', _source: { message: 'test' }, sort: [1000] },
            { _id: '2', _source: { message: 'test2' }, sort: [2000] },
          ],
          total: { value: 2 },
        },
      };
      mockSearch.mockReturnValue(createMockResponse(mockResponse));

      const result = await service.dslPaginated({
        index: 'logs-*',
        query: { match_all: {} },
        sort: [{ timestamp: 'desc' }],
      });

      const nextPage = await result.pagination.nextPage();

      expect(nextPage).toBeNull();
    });
  });
  describe('eql', () => {
    it('executes with correct strategy', async () => {
      const mockResponse = { hits: { events: [] } };
      mockSearch.mockReturnValue(createMockResponse(mockResponse));

      await service.eql({
        index: 'logs-*',
        query: 'process where process.name == "regsvr32.exe"',
      });

      expect(mockSearch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          strategy: 'eql',
        })
      );
    });

    it('maps params correctly', async () => {
      const mockResponse = { hits: { events: [] } };
      mockSearch.mockReturnValue(createMockResponse(mockResponse));

      const params = {
        index: 'logs-*',
        query: 'process where process.name == "regsvr32.exe"',
        filter: { term: { 'agent.id': 'test' } },
        size: 100,
        fields: ['process.name', 'process.pid'],
        runtimeMappings: { runtime_field: { type: 'keyword' as const } },
      };

      await service.eql(params);

      expect(mockSearch).toHaveBeenCalledWith(
        {
          params: {
            index: params.index,
            body: {
              query: params.query,
              filter: params.filter,
              size: params.size,
              fields: params.fields,
              runtime_mappings: params.runtimeMappings,
            },
          },
        },
        expect.anything()
      );
    });

    it('passes options correctly', async () => {
      const mockResponse = { hits: { events: [] } };
      mockSearch.mockReturnValue(createMockResponse(mockResponse));

      const abortController = new AbortController();
      const options = {
        abortSignal: abortController.signal,
        sessionId: 'test-session',
      };

      await service.eql(
        {
          index: 'logs-*',
          query: 'process where process.name == "regsvr32.exe"',
        },
        options
      );

      expect(mockSearch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          abortSignal: options.abortSignal,
          sessionId: options.sessionId,
        })
      );
    });

    it('returns rawResponse', async () => {
      const mockResponse = { hits: { events: [] } };
      mockSearch.mockReturnValue(createMockResponse(mockResponse));

      const result = await service.eql({
        index: 'logs-*',
        query: 'process where process.name == "regsvr32.exe"',
      });

      expect(result).toEqual({ rawResponse: mockResponse });
    });
  });

  describe('sql', () => {
    it('executes with correct strategy', async () => {
      const mockResponse = { columns: [], rows: [] };
      mockSearch.mockReturnValue(createMockResponse(mockResponse));

      await service.sql({ query: 'SELECT * FROM logs' });

      expect(mockSearch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          strategy: 'sql',
        })
      );
    });

    it('maps params correctly', async () => {
      const mockResponse = { columns: [], rows: [] };
      mockSearch.mockReturnValue(createMockResponse(mockResponse));

      const params = {
        query: 'SELECT * FROM logs WHERE status = ?',
        params: [200],
        fetchSize: 50,
        filter: { term: { field: 'value' } },
      };

      await service.sql(params);

      expect(mockSearch).toHaveBeenCalledWith(
        {
          params: {
            body: {
              query: params.query,
              params: params.params,
              fetch_size: params.fetchSize,
              filter: params.filter,
            },
          },
        },
        expect.anything()
      );
    });

    it('passes options correctly', async () => {
      const mockResponse = { columns: [], rows: [] };
      mockSearch.mockReturnValue(createMockResponse(mockResponse));

      const abortController = new AbortController();
      const options = {
        abortSignal: abortController.signal,
        sessionId: 'test-session',
        executionContext: { type: 'test' as const, name: 'test' },
      };

      await service.sql({ query: 'SELECT * FROM logs' }, options);

      expect(mockSearch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          abortSignal: options.abortSignal,
          sessionId: options.sessionId,
          executionContext: options.executionContext,
        })
      );
    });

    it('returns rawResponse', async () => {
      const mockResponse = { columns: [], rows: [] };
      mockSearch.mockReturnValue(createMockResponse(mockResponse));

      const result = await service.sql({ query: 'SELECT * FROM logs' });

      expect(result).toEqual({ rawResponse: mockResponse });
    });
  });
});
