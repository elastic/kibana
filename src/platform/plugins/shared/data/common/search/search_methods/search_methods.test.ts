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
import type { EsQueryConfig, Filter } from '@kbn/es-query';
import { ESQLVariableType } from '@kbn/esql-types';

describe('SearchMethodsService', () => {
  let mockSearch: jest.MockedFunction<ISearchGeneric>;
  let service: SearchMethodsService;
  let getEsQueryConfig: jest.MockedFunction<() => Promise<EsQueryConfig>>;

  beforeEach(() => {
    mockSearch = jest.fn();
    getEsQueryConfig = jest.fn().mockResolvedValue({
      allowLeadingWildcards: true,
      queryStringOptions: {},
      ignoreFilterIfFieldNotInIndex: false,
      dateFormatTZ: 'America/New_York',
    });
    service = new SearchMethodsService(mockSearch, { getEsQueryConfig });
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
      };

      await service.esql({ query: 'FROM logs', projectRouting: 'test-project' }, options);

      expect(mockSearch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          abortSignal: options.abortSignal,
          sessionId: options.sessionId,
          executionContext: options.executionContext,
          projectRouting: 'test-project',
        })
      );
    });

    it('requests column_metadata when columnMetadata param is true', async () => {
      const mockResponse = { columns: [], values: [] };
      mockSearch.mockReturnValue(createMockResponse(mockResponse));

      await service.esql({ query: 'FROM logs', columnMetadata: true });

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

    it('returns rawResponse and datatable when includeDataTable is set', async () => {
      const mockResponse = { columns: [], values: [] };
      mockSearch.mockReturnValue(createMockResponse(mockResponse));

      const result = await service.esql({ query: 'FROM logs' }, { includeDataTable: true });

      expect(result.rawResponse).toEqual(mockResponse);
      expect(result.datatable).toMatchObject({ type: 'datatable', columns: [], rows: [] });
    });

    it('does not compute the datatable by default', async () => {
      const mockResponse = { columns: [], values: [] };
      mockSearch.mockReturnValue(createMockResponse(mockResponse));

      const result = await service.esql({ query: 'FROM logs' });

      expect(result.rawResponse).toEqual(mockResponse);
      expect(result.datatable).toBeUndefined();
    });

    describe('inspector', () => {
      it('calls inspector.adapter.start with correct parameters', async () => {
        const mockResponse = { columns: [], values: [] };
        mockSearch.mockReturnValue(createMockResponse(mockResponse));
        const requestResponder = createMockRequestResponder();
        const inspector = createMockInspector(requestResponder);

        await service.esql({ query: 'FROM logs' }, { inspector, sessionId: 'test-session-123' });

        expect(inspector.adapter.start).toHaveBeenCalledWith('Test Request', {
          description: 'Test description',
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

        expect(result.rawResponse).toEqual(mockResponse);
      });

      it('calls requestResponder.error when search throws with error.attributes', async () => {
        const mockError = Object.assign(new Error('Search failed'), {
          attributes: { type: 'validation_exception', reason: 'Invalid query' },
        });
        mockSearch.mockReturnValue(throwError(() => mockError));
        const requestResponder = createMockRequestResponder();
        const inspector = createMockInspector(requestResponder);

        await expect(service.esql({ query: 'FROM logs' }, { inspector })).rejects.toThrow(
          'Unexpected error from Elasticsearch: validation_exception - Invalid query'
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

    describe('search context', () => {
      const phraseFilter: Filter = {
        meta: { alias: null, disabled: false, negate: false },
        query: { match_phrase: { host: 'fromFilterPill' } },
      };
      const timeRange = { from: '2024-01-01T00:00:00.000Z', to: '2024-01-02T00:00:00.000Z' };

      const getRequestParams = () => mockSearch.mock.calls[0][0].params;

      beforeEach(() => {
        mockSearch.mockReturnValue(createMockResponse({ columns: [], values: [] }));
      });

      it('defaults the time zone from advanced settings even with no context fields', async () => {
        await service.esql({ query: 'FROM logs' });

        expect(getRequestParams().time_zone).toBe('America/New_York');
      });

      it('combines kibanaFilters, kqlQuery, and timeRange into the request filter', async () => {
        await service.esql({
          query: 'FROM logs',
          kibanaQueryContext: {
            timeRange,
            timeField: '@timestamp',
            kibanaFilters: [phraseFilter],
            kqlQuery: { language: 'kuery', query: 'service:fromQueryBar' },
          },
        });

        const filterJson = JSON.stringify(getRequestParams().filter);
        expect(filterJson).toContain('fromFilterPill');
        expect(filterJson).toContain('fromQueryBar');
        expect(getRequestParams().filter.bool.filter).toContainEqual({
          range: {
            '@timestamp': {
              format: 'strict_date_optional_time',
              gte: timeRange.from,
              lte: timeRange.to,
            },
          },
        });
      });

      it('only applies the timeRange through named params without a timeField', async () => {
        await service.esql({
          query: 'FROM logs | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend',
          kibanaQueryContext: { timeRange },
        });

        expect(getRequestParams().filter).toBeUndefined();
        expect(getRequestParams().params).toEqual([
          { _tstart: timeRange.from },
          { _tend: timeRange.to },
        ]);
      });

      it('adds control variables used in the query as named params', async () => {
        await service.esql({
          query: 'FROM logs | STATS COUNT(*) BY ?field',
          kibanaQueryContext: {
            esqlVariables: [
              { key: 'field', value: 'host', type: ESQLVariableType.FIELDS },
              { key: 'unused', value: 'other', type: ESQLVariableType.VALUES },
            ],
          },
        });

        expect(getRequestParams().query).toBe('FROM logs | STATS COUNT(*) BY ??field');
        expect(getRequestParams().params).toEqual([{ field: 'host' }]);
      });

      it('merges the context with the filter and named params from the caller', async () => {
        const callerFilter = { term: { status: 'fromCaller' } };

        await service.esql({
          query: 'FROM logs | WHERE status == ?status AND @timestamp >= ?_tstart',
          params: [{ status: 'fromCaller' }],
          filter: callerFilter,
          kibanaQueryContext: { timeRange, kibanaFilters: [phraseFilter] },
        });

        expect(getRequestParams().filter.bool.filter).toContainEqual(callerFilter);
        expect(JSON.stringify(getRequestParams().filter)).toContain('fromFilterPill');
        expect(getRequestParams().params).toEqual([
          { status: 'fromCaller' },
          { _tstart: timeRange.from },
        ]);
      });

      it('ignores ES|QL queries in kqlQuery', async () => {
        await service.esql({
          query: 'FROM logs',
          kibanaQueryContext: { kqlQuery: { esql: 'FROM other' } as any },
        });

        expect(getRequestParams().filter).toBeUndefined();
      });

      it('prefers the timeZone from the caller', async () => {
        await service.esql({ query: 'FROM logs', timeZone: 'Europe/Paris' });

        expect(getRequestParams().time_zone).toBe('Europe/Paris');
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

    it('maps projectRouting from params to search options and not into the body', async () => {
      mockSearch.mockReturnValue(createMockResponse({ hits: { hits: [], total: 0 } }));

      await service.dsl({ index: 'logs-*', projectRouting: 'test-project' });

      const [request, searchOptions] = mockSearch.mock.calls[0];
      expect(searchOptions).toEqual(expect.objectContaining({ projectRouting: 'test-project' }));
      expect(request.params.body).not.toHaveProperty('projectRouting');
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

    describe('search context', () => {
      const phraseFilter: Filter = {
        meta: { alias: null, disabled: false, negate: false },
        query: { match_phrase: { host: 'fromFilterPill' } },
      };
      const timeRange = { from: '2024-01-01T00:00:00.000Z', to: '2024-01-02T00:00:00.000Z' };

      const getRequestBody = () => mockSearch.mock.calls[0][0].params.body;

      beforeEach(() => {
        mockSearch.mockReturnValue(createMockResponse({ hits: { hits: [], total: 0 } }));
      });

      it('leaves the query untouched when the context has nothing to apply', async () => {
        const query = { term: { field: 'value' } };

        await service.dsl({ index: 'logs-*', query, kibanaQueryContext: {} });

        expect(getRequestBody().query).toEqual(query);
      });

      it('does not add a query when neither the context nor the caller provide one', async () => {
        await service.dsl({ index: 'logs-*', kibanaQueryContext: {} });

        expect(getRequestBody().query).toBeUndefined();
      });

      it('does not send kibanaQueryContext to Elasticsearch', async () => {
        await service.dsl({
          index: 'logs-*',
          kibanaQueryContext: { kibanaFilters: [phraseFilter] },
        });

        expect(getRequestBody()).not.toHaveProperty('kibanaQueryContext');
      });

      it('applies kibanaFilters as bool filters', async () => {
        await service.dsl({
          index: 'logs-*',
          kibanaQueryContext: { kibanaFilters: [phraseFilter] },
        });

        expect(getRequestBody().query.bool.filter).toEqual([
          { match_phrase: { host: 'fromFilterPill' } },
        ]);
      });

      it('applies a kuery kqlQuery as a bool filter', async () => {
        await service.dsl({
          index: 'logs-*',
          kibanaQueryContext: { kqlQuery: { language: 'kuery', query: 'host: "a"' } },
        });

        expect(getRequestBody().query.bool.must).toEqual([]);
        expect(getRequestBody().query.bool.filter).toEqual([
          { bool: { should: [{ match_phrase: { host: 'a' } }], minimum_should_match: 1 } },
        ]);
      });

      it('applies the timeRange to the timeField', async () => {
        await service.dsl({
          index: 'logs-*',
          kibanaQueryContext: { timeRange, timeField: '@timestamp' },
        });

        expect(getRequestBody().query.bool.filter).toEqual([
          {
            range: {
              '@timestamp': {
                format: 'strict_date_optional_time',
                gte: timeRange.from,
                lte: timeRange.to,
              },
            },
          },
        ]);
      });

      it('appends the caller query to the must clause of the context query', async () => {
        const query = { term: { field3: 'value3' } };

        await service.dsl({
          index: 'logs-*',
          query,
          kibanaQueryContext: { kibanaFilters: [phraseFilter] },
        });

        const { bool } = getRequestBody().query;
        expect(bool.must).toContainEqual(query);
        expect(bool.filter).toEqual([{ match_phrase: { host: 'fromFilterPill' } }]);
      });

      it('combines filters, kqlQuery, timeRange and the caller query', async () => {
        const query = { term: { field3: 'value3' } };

        await service.dsl({
          index: 'logs-*',
          query,
          kibanaQueryContext: {
            kibanaFilters: [phraseFilter],
            kqlQuery: { language: 'lucene', query: 'message:error' },
            timeRange,
            timeField: '@timestamp',
          },
        });

        const { bool } = getRequestBody().query;
        expect(bool.must).toEqual([{ query_string: expect.any(Object) }, query]);
        expect(bool.filter).toHaveLength(2);
      });

      it('reads the es query config from the deps', async () => {
        await service.dsl({
          index: 'logs-*',
          kibanaQueryContext: { kqlQuery: { language: 'lucene', query: '*' } },
        });

        expect(getEsQueryConfig).toHaveBeenCalledTimes(1);
        expect(getRequestBody().query.bool.must[0].query_string.time_zone).toBe('America/New_York');
      });

      it('does not read the es query config without a context', async () => {
        await service.dsl({ index: 'logs-*', query: { match_all: {} } });

        expect(getEsQueryConfig).not.toHaveBeenCalled();
      });
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
          description: 'Test description',
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
            trackTotalHits: true,
          },
          { inspector }
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
        sort: [{ '@timestamp': 'desc' }],
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

    it('nextPage() keeps track_total_hits so later pages can detect more results', async () => {
      const page = (ids: string[]) => ({
        hits: {
          hits: ids.map((id) => ({ _id: id, sort: [Number(id)] })),
          total: { value: 100 },
        },
      });
      mockSearch
        .mockReturnValueOnce(createMockResponse(page(['1', '2'])))
        .mockReturnValueOnce(createMockResponse(page(['3', '4'])))
        .mockReturnValueOnce(createMockResponse(page(['5', '6'])));

      const first = await service.dslPaginated({
        index: 'logs-*',
        sort: [{ timestamp: 'desc' }],
      });
      const second = await first.pagination.nextPage();
      await second?.pagination.nextPage();

      [0, 1, 2].forEach((call) => {
        expect(mockSearch.mock.calls[call][0].params.body.track_total_hits).toBe(true);
      });
    });

    describe('search context', () => {
      const phraseFilter: Filter = {
        meta: { alias: null, disabled: false, negate: false },
        query: { match_phrase: { host: 'fromFilterPill' } },
      };
      const timeRange = { from: '2024-01-01T00:00:00.000Z', to: '2024-01-02T00:00:00.000Z' };
      const sort = [{ timestamp: 'desc' as const }];

      const page = (id: string, sortValue: number) => ({
        hits: { hits: [{ _id: id, _source: {}, sort: [sortValue] }], total: { value: 100 } },
      });
      const getBody = (call: number) => mockSearch.mock.calls[call][0].params.body;

      beforeEach(() => {
        mockSearch
          .mockReturnValueOnce(createMockResponse(page('1', 1000)))
          .mockReturnValueOnce(createMockResponse(page('2', 2000)));
      });

      it('leaves the query untouched without a context', async () => {
        const query = { term: { field: 'value' } };

        await service.dslPaginated({ index: 'logs-*', query, sort });

        expect(getBody(0).query).toEqual(query);
        expect(getEsQueryConfig).not.toHaveBeenCalled();
      });

      it('leaves the query untouched when the context has nothing to apply', async () => {
        const query = { term: { field: 'value' } };

        await service.dslPaginated({ index: 'logs-*', query, sort, kibanaQueryContext: {} });

        expect(getBody(0).query).toEqual(query);
      });

      it('applies kibanaFilters', async () => {
        await service.dslPaginated({
          index: 'logs-*',
          sort,
          kibanaQueryContext: { kibanaFilters: [phraseFilter] },
        });

        expect(getBody(0).query.bool.filter).toEqual([
          { match_phrase: { host: 'fromFilterPill' } },
        ]);
      });

      it('applies kqlQuery', async () => {
        await service.dslPaginated({
          index: 'logs-*',
          sort,
          kibanaQueryContext: { kqlQuery: { language: 'lucene', query: 'message:error' } },
        });

        expect(getBody(0).query.bool.must).toEqual([{ query_string: expect.any(Object) }]);
      });

      it('applies the timeRange to the timeField', async () => {
        await service.dslPaginated({
          index: 'logs-*',
          sort,
          kibanaQueryContext: { timeRange, timeField: '@timestamp' },
        });

        expect(getBody(0).query.bool.filter).toEqual([
          {
            range: {
              '@timestamp': {
                format: 'strict_date_optional_time',
                gte: timeRange.from,
                lte: timeRange.to,
              },
            },
          },
        ]);
      });

      it('does not send kibanaQueryContext to Elasticsearch', async () => {
        const result = await service.dslPaginated({
          index: 'logs-*',
          sort,
          kibanaQueryContext: { kibanaFilters: [phraseFilter] },
        });
        await result.pagination.nextPage();

        expect(getBody(0)).not.toHaveProperty('kibanaQueryContext');
        expect(getBody(1)).not.toHaveProperty('kibanaQueryContext');
      });

      it('still requests track_total_hits with a context', async () => {
        await service.dslPaginated({
          index: 'logs-*',
          sort,
          kibanaQueryContext: { kibanaFilters: [phraseFilter] },
        });

        expect(getBody(0).track_total_hits).toBe(true);
      });

      it('reuses the same merged query on nextPage() without re-reading the config', async () => {
        const result = await service.dslPaginated({
          index: 'logs-*',
          query: { term: { field3: 'value3' } },
          sort,
          kibanaQueryContext: { kibanaFilters: [phraseFilter], timeRange, timeField: '@timestamp' },
        });
        await result.pagination.nextPage();

        expect(getEsQueryConfig).toHaveBeenCalledTimes(1);
        expect(getBody(1).query).toEqual(getBody(0).query);
        expect(getBody(1).search_after).toEqual([1000]);
      });
    });

    it('applies kibanaQueryContext to the first page and keeps it on nextPage()', async () => {
      const page = (id: string, sort: number) => ({
        hits: { hits: [{ _id: id, _source: {}, sort: [sort] }], total: { value: 100 } },
      });
      mockSearch
        .mockReturnValueOnce(createMockResponse(page('1', 1000)))
        .mockReturnValueOnce(createMockResponse(page('2', 2000)));
      const query = { term: { field3: 'value3' } };

      const result = await service.dslPaginated({
        index: 'logs-*',
        query,
        sort: [{ timestamp: 'desc' }],
        kibanaQueryContext: {
          kibanaFilters: [
            {
              meta: { alias: null, disabled: false, negate: false },
              query: { match_phrase: { host: 'fromFilterPill' } },
            },
          ],
        },
      });
      await result.pagination.nextPage();

      expect(getEsQueryConfig).toHaveBeenCalledTimes(1);
      [0, 1].forEach((call) => {
        const body = mockSearch.mock.calls[call][0].params.body;
        expect(body).not.toHaveProperty('kibanaQueryContext');
        expect(body.query.bool.filter).toEqual([{ match_phrase: { host: 'fromFilterPill' } }]);
        expect(body.query.bool.must).toContainEqual(query);
      });
      expect(mockSearch.mock.calls[1][0].params.body.search_after).toEqual([1000]);
    });

    it('nextPage() keeps projectRouting from the params', async () => {
      const page = (id: string, sort: number) => ({
        hits: { hits: [{ _id: id, _source: {}, sort: [sort] }], total: { value: 100 } },
      });
      mockSearch
        .mockReturnValueOnce(createMockResponse(page('1', 1000)))
        .mockReturnValueOnce(createMockResponse(page('2', 2000)));

      const result = await service.dslPaginated({
        index: 'logs-*',
        sort: [{ timestamp: 'desc' }],
        projectRouting: 'test-project',
      });
      await result.pagination.nextPage();

      expect(mockSearch).toHaveBeenNthCalledWith(
        2,
        expect.anything(),
        expect.objectContaining({ projectRouting: 'test-project' })
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

    describe('nextPage() options', () => {
      const paginatedParams = {
        index: 'logs-*',
        query: { match_all: {} },
        sort: [{ timestamp: 'desc' as const }],
      };

      const mockTwoPages = () => {
        const page = (ids: string[]) => ({
          hits: {
            hits: ids.map((id) => ({ _id: id, sort: [Number(id) * 1000] })),
            total: { value: 100 },
          },
        });
        mockSearch
          .mockReturnValueOnce(createMockResponse(page(['1', '2'])))
          .mockReturnValueOnce(createMockResponse(page(['3'])));
      };

      const executionContext = {
        type: 'application' as const,
        name: 'discover',
        description: 'fetch documents',
      };

      it('does not carry over the session id or abort signal of the first page', async () => {
        mockTwoPages();

        const result = await service.dslPaginated(paginatedParams, {
          sessionId: 'original-session-id',
          abortSignal: new AbortController().signal,
        });
        await result.pagination.nextPage();

        expect(mockSearch).toHaveBeenNthCalledWith(
          2,
          expect.anything(),
          expect.objectContaining({ sessionId: undefined, abortSignal: undefined })
        );
      });

      it('inherits the execution context of the first page by default', async () => {
        mockTwoPages();

        const result = await service.dslPaginated(paginatedParams, { executionContext });
        await result.pagination.nextPage();

        expect(mockSearch).toHaveBeenNthCalledWith(
          2,
          expect.anything(),
          expect.objectContaining({ executionContext })
        );
      });

      it('allows overriding the abort signal and execution context', async () => {
        mockTwoPages();
        const abortSignal = new AbortController().signal;
        const overrideContext = { ...executionContext, description: 'fetch more documents' };

        const result = await service.dslPaginated(paginatedParams, { executionContext });
        await result.pagination.nextPage({ abortSignal, executionContext: overrideContext });

        expect(mockSearch).toHaveBeenNthCalledWith(
          2,
          expect.anything(),
          expect.objectContaining({ abortSignal, executionContext: overrideContext })
        );
      });
    });

    describe('inspector', () => {
      const paginatedParams = {
        index: 'logs-*',
        query: { match_all: {} },
        sort: [{ timestamp: 'desc' as const }],
      };

      const mockTwoPages = () => {
        const page = (ids: string[]) => ({
          hits: {
            hits: ids.map((id) => ({ _id: id, sort: [Number(id) * 1000] })),
            total: { value: 100 },
          },
        });
        mockSearch
          .mockReturnValueOnce(createMockResponse(page(['1', '2'])))
          .mockReturnValueOnce(createMockResponse(page(['3'])));
      };

      it('logs the first page with the session id it belongs to', async () => {
        mockTwoPages();
        const requestResponder = createMockRequestResponder();
        const inspector = createMockInspector(requestResponder);

        await service.dslPaginated(paginatedParams, { inspector, sessionId: 'session-1' });

        expect(inspector.adapter.start).toHaveBeenCalledTimes(1);
        expect(inspector.adapter.start).toHaveBeenCalledWith('Test Request', {
          description: 'Test description',
          searchSessionId: 'session-1',
        });
        expect(requestResponder.json).toHaveBeenCalled();
        expect(requestResponder.ok).toHaveBeenCalled();
      });

      it('logs each page with the same adapter, without the session id after the first', async () => {
        mockTwoPages();
        const requestResponder = createMockRequestResponder();
        const inspector = createMockInspector(requestResponder);

        const result = await service.dslPaginated(paginatedParams, {
          inspector,
          sessionId: 'session-1',
        });
        await result.pagination.nextPage();

        expect(inspector.adapter.start).toHaveBeenCalledTimes(2);
        expect(inspector.adapter.start).toHaveBeenNthCalledWith(2, 'Test Request', {
          description: 'Test description',
          searchSessionId: undefined,
        });
      });

      it('allows overriding the inspector title and description per page', async () => {
        mockTwoPages();
        const requestResponder = createMockRequestResponder();
        const inspector = createMockInspector(requestResponder);

        const result = await service.dslPaginated(paginatedParams, { inspector });
        await result.pagination.nextPage({
          inspectorTitle: 'Page 2 Request',
          inspectorDescription: 'Fetching second page',
        });

        expect(inspector.adapter.start).toHaveBeenNthCalledWith(2, 'Page 2 Request', {
          description: 'Fetching second page',
          searchSessionId: undefined,
        });
      });

      it('falls back to the original title and description for a page without overrides', async () => {
        mockTwoPages();
        const requestResponder = createMockRequestResponder();
        const inspector = createMockInspector(requestResponder);

        const result = await service.dslPaginated(paginatedParams, { inspector });
        await result.pagination.nextPage({ inspectorTitle: 'Only the title' });

        expect(inspector.adapter.start).toHaveBeenNthCalledWith(2, 'Only the title', {
          description: 'Test description',
          searchSessionId: undefined,
        });
      });

      it('does not log requests when no adapter is provided', async () => {
        mockTwoPages();

        const result = await service.dslPaginated(paginatedParams, {
          inspector: { title: 'No adapter' },
        });
        const nextPage = await result.pagination.nextPage();

        expect(nextPage).not.toBeNull();
        expect(mockSearch).toHaveBeenCalledTimes(2);
      });

      it('logs an error when a page fails', async () => {
        mockSearch.mockReturnValue(throwError(() => new Error('Search failed')));
        const requestResponder = createMockRequestResponder();
        const inspector = createMockInspector(requestResponder);

        await expect(service.dslPaginated(paginatedParams, { inspector })).rejects.toThrow(
          'Search failed'
        );

        expect(requestResponder.error).toHaveBeenCalledWith({
          json: { message: 'Search failed' },
        });
      });
    });
  });
});
