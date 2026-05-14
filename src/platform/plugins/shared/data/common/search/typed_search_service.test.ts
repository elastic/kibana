/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { of } from 'rxjs';
import { TypedSearchService } from './typed_search_service';
import type { ISearchGeneric } from '@kbn/search-types';

describe('TypedSearchService', () => {
  let mockSearch: jest.MockedFunction<ISearchGeneric>;
  let service: TypedSearchService;

  beforeEach(() => {
    mockSearch = jest.fn();
    service = new TypedSearchService(mockSearch);
  });

  const createMockResponse = (rawResponse: object, isRunning = false) => {
    return of({
      isRunning,
      rawResponse,
    });
  };

  describe('searchESQL', () => {
    it('executes with correct strategy', async () => {
      const mockResponse = { columns: [], values: [] };
      mockSearch.mockReturnValue(createMockResponse(mockResponse));

      await service.searchESQL({ query: 'FROM logs' });

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
        limit: 100,
        filter: { term: { field: 'value' } },
        timeZone: 'UTC',
        locale: 'en-US',
      };

      await service.searchESQL(params);

      expect(mockSearch).toHaveBeenCalledWith(
        {
          params: {
            body: {
              query: params.query,
              params: params.params,
              limit: params.limit,
              filter: params.filter,
              time_zone: params.timeZone,
              locale: params.locale,
            },
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

      await service.searchESQL({ query: 'FROM logs' }, options);

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

    it('returns rawResponse', async () => {
      const mockResponse = { columns: [], values: [] };
      mockSearch.mockReturnValue(createMockResponse(mockResponse));

      const result = await service.searchESQL({ query: 'FROM logs' });

      expect(result).toEqual({ rawResponse: mockResponse });
    });
  });

  describe('searchDSL', () => {
    it('executes with correct strategy', async () => {
      const mockResponse = { hits: { hits: [], total: 0 } };
      mockSearch.mockReturnValue(createMockResponse(mockResponse));

      await service.searchDSL({
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

      await service.searchDSL(params);

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

    it('passes DSL-specific options', async () => {
      const mockResponse = { hits: { hits: [], total: 0 } };
      mockSearch.mockReturnValue(createMockResponse(mockResponse));

      const mockDataView = { id: 'test-dataview' };
      const options = {
        legacyHitsTotal: false,
        dataView: mockDataView as any,
      };

      await service.searchDSL(
        {
          index: 'logs-*',
          query: { match_all: {} },
        },
        options
      );

      expect(mockSearch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          legacyHitsTotal: options.legacyHitsTotal,
          indexPattern: options.dataView,
        })
      );
    });

    describe('without pagination', () => {
      it('returns result without pagination property', async () => {
        const mockResponse = { hits: { hits: [], total: 0 } };
        mockSearch.mockReturnValue(createMockResponse(mockResponse));

        const result = await service.searchDSL({
          index: 'logs-*',
          query: { match_all: {} },
        });

        expect(result).toEqual({ rawResponse: mockResponse });
        expect(result.pagination).toBeUndefined();
      });
    });

    describe('with pagination', () => {
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

        const result = await service.searchDSL(
          {
            index: 'logs-*',
            query: { match_all: {} },
            sort: [{ timestamp: 'desc' }],
          },
          { paginate: true }
        );

        expect(result.pagination).toBeDefined();
        expect(result.pagination?.hasNextPage).toBeDefined();
        expect(result.pagination?.nextPage).toBeDefined();
        expect(result.pagination?.getAllPages).toBeDefined();
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

        const result = await service.searchDSL(
          {
            index: 'logs-*',
            query: { match_all: {} },
            sort: [{ timestamp: 'desc' }],
          },
          { paginate: true }
        );

        expect(result.pagination?.hasNextPage).toBe(true);
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

        const result = await service.searchDSL(
          {
            index: 'logs-*',
            query: { match_all: {} },
            sort: [{ timestamp: 'desc' }],
          },
          { paginate: true }
        );

        expect(result.pagination?.hasNextPage).toBe(false);
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

        const result = await service.searchDSL(
          {
            index: 'logs-*',
            query: { match_all: {} },
          },
          { paginate: true }
        );

        expect(result.pagination?.hasNextPage).toBe(false);
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

        const result = await service.searchDSL(
          {
            index: 'logs-*',
            query: { match_all: {} },
            sort: [{ timestamp: 'desc' }],
          },
          { paginate: true }
        );

        await result.pagination?.nextPage();

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

        const result = await service.searchDSL(
          {
            index: 'logs-*',
            query: { match_all: {} },
            sort: [{ timestamp: 'desc' }],
          },
          { paginate: true }
        );

        const nextPage = await result.pagination?.nextPage();

        expect(nextPage).toBeNull();
      });

      it('getAllPages() yields all pages', async () => {
        const page1 = {
          hits: {
            hits: [{ _id: '1', sort: [1000] }],
            total: { value: 3 },
          },
        };

        const page2 = {
          hits: {
            hits: [{ _id: '2', sort: [2000] }],
            total: { value: 3 },
          },
        };

        const page3 = {
          hits: {
            hits: [
              { _id: '3', sort: [3000] },
              { _id: '4', sort: [4000] },
              { _id: '5', sort: [5000] },
            ],
            total: { value: 3 },
          },
        };

        mockSearch
          .mockReturnValueOnce(createMockResponse(page1))
          .mockReturnValueOnce(createMockResponse(page2))
          .mockReturnValueOnce(createMockResponse(page3));

        const result = await service.searchDSL(
          {
            index: 'logs-*',
            query: { match_all: {} },
            sort: [{ timestamp: 'desc' }],
          },
          { paginate: true }
        );

        const pages = [];
        for await (const page of result.pagination!.getAllPages()) {
          pages.push(page);
        }

        expect(pages).toHaveLength(3);
        expect(pages[0].rawResponse.hits.hits[0]._id).toBe('1');
        expect(pages[1].rawResponse.hits.hits[0]._id).toBe('2');
        expect(pages[2].rawResponse.hits.hits[0]._id).toBe('3');
      });

      it('getAllPages() respects maxPages limit', async () => {
        const pageResponse = {
          hits: {
            hits: [{ _id: '1', sort: [1000] }],
            total: { value: 1000 },
          },
        };

        mockSearch.mockReturnValue(createMockResponse(pageResponse));

        const result = await service.searchDSL(
          {
            index: 'logs-*',
            query: { match_all: {} },
            sort: [{ timestamp: 'desc' }],
          },
          { paginate: true }
        );

        const pages = [];
        for await (const page of result.pagination!.getAllPages(3)) {
          pages.push(page);
        }

        expect(pages).toHaveLength(3);
      });
    });
  });

  describe('searchEQL', () => {
    it('executes with correct strategy', async () => {
      const mockResponse = { hits: { events: [] } };
      mockSearch.mockReturnValue(createMockResponse(mockResponse));

      await service.searchEQL({
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

      await service.searchEQL(params);

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

      await service.searchEQL(
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

      const result = await service.searchEQL({
        index: 'logs-*',
        query: 'process where process.name == "regsvr32.exe"',
      });

      expect(result).toEqual({ rawResponse: mockResponse });
    });
  });

  describe('searchSQL', () => {
    it('executes with correct strategy', async () => {
      const mockResponse = { columns: [], rows: [] };
      mockSearch.mockReturnValue(createMockResponse(mockResponse));

      await service.searchSQL({ query: 'SELECT * FROM logs' });

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

      await service.searchSQL(params);

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

      await service.searchSQL({ query: 'SELECT * FROM logs' }, options);

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

      const result = await service.searchSQL({ query: 'SELECT * FROM logs' });

      expect(result).toEqual({ rawResponse: mockResponse });
    });
  });
});
