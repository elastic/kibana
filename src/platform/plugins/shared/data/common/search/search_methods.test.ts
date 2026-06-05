/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { of, throwError } from 'rxjs';
import { SearchMethodsService } from './search_methods';
import type { ISearchGeneric } from '@kbn/search-types';
import type { AbstractDataView } from '@kbn/data-views-plugin/common';
import type { RequestAdapter } from '@kbn/inspector-plugin/common';

describe('SearchMethodsService', () => {
  let mockSearch: jest.MockedFunction<ISearchGeneric>;
  let service: SearchMethodsService;

  beforeEach(() => {
    mockSearch = jest.fn();
    service = new SearchMethodsService(mockSearch);
  });

  const createMockResponse = (
    rawResponse: object,
    isRunning = false,
    took?: number,
    requestParams?: { path: string; method: string }
  ) => {
    return of({
      isRunning,
      rawResponse,
      took,
      requestParams,
    });
  };

  const createMockRequestResponder = () => ({
    json: jest.fn().mockReturnThis(),
    stats: jest.fn().mockReturnThis(),
    ok: jest.fn(),
    error: jest.fn(),
  });

  const createMockInspector = (
    requestResponder: ReturnType<typeof createMockRequestResponder>
  ) => ({
    adapter: { start: jest.fn().mockReturnValue(requestResponder) } as unknown as RequestAdapter,
    title: 'Test Request',
    description: 'Test description',
    id: 'test-id',
  });

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

    it('returns rawResponse', async () => {
      const mockResponse = { columns: [], values: [] };
      mockSearch.mockReturnValue(createMockResponse(mockResponse));

      const result = await service.esql({ query: 'FROM logs' });

      expect(result).toEqual({ rawResponse: mockResponse });
    });

    describe('inspector', () => {
      it('calls inspector.adapter.start with correct parameters', async () => {
        const mockResponse = { columns: [], values: [] };
        mockSearch.mockReturnValue(createMockResponse(mockResponse));
        const requestResponder = createMockRequestResponder();
        const inspector = createMockInspector(requestResponder);

        await service.esql({ query: 'FROM logs' }, { inspector, sessionId: 'test-session-123' });

        expect(inspector.adapter.start).toHaveBeenCalledWith('Test Request', {
          id: 'test-id',
          description: 'Test description',
          searchSessionId: 'test-session-123',
        });
      });

      it('calls requestResponder.json with ES|QL request params', async () => {
        const mockResponse = { columns: [], values: [] };
        mockSearch.mockReturnValue(createMockResponse(mockResponse));
        const requestResponder = createMockRequestResponder();
        const inspector = createMockInspector(requestResponder);

        await service.esql(
          {
            query: 'FROM logs | WHERE status > ?foo',
            params: [{ name: 'foo', value: 200 }],
            filter: { term: { field: 'value' } },
            timeZone: 'UTC',
            locale: 'en-US',
          },
          { inspector }
        );

        expect(requestResponder.json).toHaveBeenCalledWith({
          query: 'FROM logs | WHERE status > ?foo',
          params: [{ name: 'foo', value: 200 }],
          filter: { term: { field: 'value' } },
          time_zone: 'UTC',
          locale: 'en-US',
          dropNullColumns: undefined,
          include_execution_metadata: undefined,
        });
      });

      it('calls requestResponder.stats with getEsqlInspectorStats result on success', async () => {
        const mockResponse = {
          columns: [{ name: 'status', type: 'integer' }],
          values: [[200], [201], [202]],
          took: 42,
        };
        mockSearch.mockReturnValue(createMockResponse(mockResponse));
        const requestResponder = createMockRequestResponder();
        const inspector = createMockInspector(requestResponder);

        await service.esql({ query: 'FROM logs' }, { inspector });

        expect(requestResponder.stats).toHaveBeenCalledWith({
          hits: {
            label: 'Hits',
            value: '3',
            description: expect.any(String),
          },
          queryTime: {
            label: 'Query time',
            value: '42ms',
            description: expect.any(String),
          },
        });
      });

      it('calls requestResponder.ok with response data on success', async () => {
        const mockResponse = { columns: [], values: [] };
        mockSearch.mockReturnValue(createMockResponse(mockResponse));
        const requestResponder = createMockRequestResponder();
        const inspector = createMockInspector(requestResponder);

        await service.esql({ query: 'FROM logs' }, { inspector });

        expect(requestResponder.ok).toHaveBeenCalledWith({
          json: { rawResponse: mockResponse },
          requestParams: undefined,
        });
      });

      it('passes requestParams to inspector ok callback', async () => {
        const mockResponse = { columns: [], values: [] };
        const requestParams = { path: '/_query', method: 'POST' };
        mockSearch.mockReturnValue(
          createMockResponse(mockResponse, false, undefined, requestParams)
        );
        const requestResponder = createMockRequestResponder();
        const inspector = createMockInspector(requestResponder);

        await service.esql({ query: 'FROM logs' }, { inspector });

        expect(requestResponder.ok).toHaveBeenCalledWith({
          json: { rawResponse: mockResponse },
          requestParams: { path: '/_query', method: 'POST' },
        });
      });

      it('works when inspector is not provided', async () => {
        const mockResponse = { columns: [], values: [] };
        mockSearch.mockReturnValue(createMockResponse(mockResponse));

        const result = await service.esql({ query: 'FROM logs' });

        expect(result).toEqual({ rawResponse: mockResponse });
      });

      it('calls requestResponder.error when search throws with error.attributes', async () => {
        const mockError = Object.assign(new Error('Search failed'), {
          attributes: { type: 'validation_exception', reason: 'Invalid query' },
        });
        mockSearch.mockReturnValue(throwError(() => mockError));
        const requestResponder = createMockRequestResponder();
        const inspector = createMockInspector(requestResponder);

        await expect(service.esql({ query: 'FROM logs' }, { inspector })).rejects.toThrow(
          'Search failed'
        );

        expect(requestResponder.json).toHaveBeenCalled();
        expect(requestResponder.error).toHaveBeenCalledWith({
          json: mockError.attributes,
        });
      });

      it('calls requestResponder.error with message when error has no attributes', async () => {
        const mockError = new Error('Network error');
        mockSearch.mockReturnValue(throwError(() => mockError));
        const requestResponder = createMockRequestResponder();
        const inspector = createMockInspector(requestResponder);

        await expect(service.esql({ query: 'FROM logs' }, { inspector })).rejects.toThrow(
          'Network error'
        );

        expect(requestResponder.error).toHaveBeenCalledWith({
          json: { message: 'Network error' },
        });
      });
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

    describe('inspector', () => {
      it('calls inspector.adapter.start with correct parameters', async () => {
        const mockResponse = { hits: { hits: [], total: 0 } };
        mockSearch.mockReturnValue(createMockResponse(mockResponse));
        const requestResponder = createMockRequestResponder();
        const inspector = createMockInspector(requestResponder);

        await service.dsl(
          { index: 'logs-*', query: { match_all: {} } },
          { inspector, sessionId: 'test-session' }
        );

        expect(inspector.adapter.start).toHaveBeenCalledWith('Test Request', {
          id: 'test-id',
          description: 'Test description',
          searchSessionId: 'test-session',
        });
      });

      it('calls requestResponder.json with DSL request body', async () => {
        const mockResponse = { hits: { hits: [], total: 0 } };
        mockSearch.mockReturnValue(createMockResponse(mockResponse));
        const requestResponder = createMockRequestResponder();
        const inspector = createMockInspector(requestResponder);

        await service.dsl(
          {
            index: 'logs-*',
            query: { match: { message: 'error' } },
            aggs: { status_count: { terms: { field: 'status' } } },
            size: 50,
          },
          { inspector, trackTotalHits: true }
        );

        expect(requestResponder.json).toHaveBeenCalledWith({
          query: { match: { message: 'error' } },
          aggs: { status_count: { terms: { field: 'status' } } },
          size: 50,
          sort: undefined,
          fields: undefined,
          _source: undefined,
          runtime_mappings: undefined,
          highlight: undefined,
          track_total_hits: true,
        });
      });

      it('calls requestResponder.stats with getResponseInspectorStats result on success', async () => {
        const mockResponse = {
          hits: {
            hits: [{ _id: '1' }, { _id: '2' }],
            total: { value: 100, relation: 'eq' },
          },
          took: 25,
        };
        mockSearch.mockReturnValue(createMockResponse(mockResponse));
        const requestResponder = createMockRequestResponder();
        const inspector = createMockInspector(requestResponder);

        await service.dsl({ index: 'logs-*', query: { match_all: {} } }, { inspector });

        expect(requestResponder.stats).toHaveBeenCalledWith({
          queryTime: {
            label: 'Query time',
            value: '25ms',
            description: expect.any(String),
          },
          hitsTotal: {
            label: 'Hits (total)',
            value: '100',
            description: expect.any(String),
          },
          hits: {
            label: 'Hits',
            value: '2',
            description: expect.any(String),
          },
        });
      });

      it('calls requestResponder.stats with getRequestStats before search when provided', async () => {
        const mockResponse = { hits: { hits: [], total: 0 } };
        mockSearch.mockReturnValue(createMockResponse(mockResponse));
        const requestResponder = createMockRequestResponder();
        const getRequestStats = jest.fn().mockReturnValue({
          customStat: { label: 'Custom', value: 'test' },
        });
        const inspector = {
          ...createMockInspector(requestResponder),
          getRequestStats,
        };

        await service.dsl({ index: 'logs-*', query: { match_all: {} } }, { inspector });

        expect(getRequestStats).toHaveBeenCalled();
        expect(requestResponder.stats).toHaveBeenCalledWith({
          customStat: { label: 'Custom', value: 'test' },
        });
      });

      it('calls requestResponder.ok with response data on success', async () => {
        const mockResponse = { hits: { hits: [], total: 0 } };
        mockSearch.mockReturnValue(createMockResponse(mockResponse));
        const requestResponder = createMockRequestResponder();
        const inspector = createMockInspector(requestResponder);

        await service.dsl({ index: 'logs-*', query: { match_all: {} } }, { inspector });

        expect(requestResponder.ok).toHaveBeenCalledWith({
          json: { rawResponse: mockResponse },
          requestParams: undefined,
        });
      });

      it('passes requestParams to inspector ok callback', async () => {
        const mockResponse = { hits: { hits: [], total: 0 } };
        const requestParams = { path: '/_search', method: 'POST' };
        mockSearch.mockReturnValue(
          createMockResponse(mockResponse, false, undefined, requestParams)
        );
        const requestResponder = createMockRequestResponder();
        const inspector = createMockInspector(requestResponder);

        await service.dsl({ index: 'logs-*', query: { match_all: {} } }, { inspector });

        expect(requestResponder.ok).toHaveBeenCalledWith({
          json: { rawResponse: mockResponse },
          requestParams: { path: '/_search', method: 'POST' },
        });
      });
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
});
