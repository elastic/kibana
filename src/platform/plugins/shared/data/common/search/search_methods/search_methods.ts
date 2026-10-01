/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lastValueFrom, takeWhile } from 'rxjs';
import { castArray } from 'lodash';
import {
  buildEsQuery,
  getTimeZoneFromSettings,
  isOfQueryType,
  type EsQueryConfig,
} from '@kbn/es-query';
import { fixESQLQueryWithVariables, getNamedParams } from '@kbn/esql-utils';
import type {
  ISearchMethods,
  IDslSearchParams,
  IDslSearchOptions,
  IDslSearchResult,
  IDslPaginatedSearchParams,
  IDslPaginatedSearchOptions,
  IDslPaginatedSearchResult,
  IDslPagination,
  IEsqlSearchParams,
  IEsqlSearchOptions,
  IEsqlSearchResult,
  IEqlSearchParams,
  IEqlSearchOptions,
  IEqlSearchResult,
  ISqlSearchParams,
  ISqlSearchOptions,
  ISqlSearchResult,
  IBaseSearchOptions,
  ISearchOptions,
  IEsSearchRequest,
  IKibanaSearchRequest,
  ISearchGeneric,
  KibanaQueryContext,
} from '@kbn/search-types';
import type { ESQLSearchParams } from '@kbn/es-types';
import type {
  ENHANCED_ES_SEARCH_STRATEGY,
  ESQL_ASYNC_SEARCH_STRATEGY,
  EQL_SEARCH_STRATEGY,
  SQL_SEARCH_STRATEGY,
} from '..';
import { getTime } from '../../query';
import { mapEsqlResponseToDatatable, formatAndRethrowEsqlError } from './datatable_mapper';
import {
  getDslRequestInspectorStats,
  getDslResponseInspectorStats,
  getEsqlInspectorStats,
  getSqlInspectorStats,
} from './inspector_stats';

export interface SearchMethodsServiceDependencies {
  /**
   * Resolves the query config from advanced settings, used to apply a search context
   */
  getEsQueryConfig: () => Promise<EsQueryConfig>;
}

/**
 * SearchMethodsService provides strategy-specific search methods with type-safe
 * parameters, invisible polling, and built-in pagination support.
 *
 * This is a common abstraction that works on both client and server by accepting
 * a generic search function that converts Observable-based searches to Promise-based
 * searches and adds pagination helpers for DSL searches using search_after.
 */
export class SearchMethodsService implements ISearchMethods {
  constructor(
    private readonly search: ISearchGeneric,
    private readonly deps: SearchMethodsServiceDependencies
  ) {}

  /**
   * Execute an ES|QL search
   */
  async esql(params: IEsqlSearchParams, options?: IEsqlSearchOptions): Promise<IEsqlSearchResult> {
    const esqlParams = await this.applyEsqlSearchContext(params);
    const request = this.buildEsqlRequest(esqlParams);
    const searchOptions = this.mapEsqlOptions(
      options,
      params,
      'esql_async' as typeof ESQL_ASYNC_SEARCH_STRATEGY
    );

    const requestResponder = options?.inspector?.adapter.start(options.inspector.title, {
      description: options.inspector.description,
      searchSessionId: searchOptions?.sessionId,
    });

    requestResponder?.json({
      ...((request.params ?? {}) as Record<string, unknown>),
      ...(params.approximation !== undefined && { approximation: params.approximation }),
    });

    try {
      const response = await this.executeSearch(request, searchOptions);

      requestResponder?.stats(getEsqlInspectorStats(response.rawResponse));
      requestResponder?.ok({
        json: { rawResponse: response.rawResponse },
        requestParams: response.requestParams,
      });

      const datatable = mapEsqlResponseToDatatable(response.rawResponse as any, {
        query: params.query,
        timeRange: params.kibanaQueryContext?.timeRange,
        esqlVariables: params.kibanaQueryContext?.esqlVariables,
        warning: response.warning,
      });

      return {
        rawResponse: response.rawResponse,
        warning: response.warning,
        datatable,
      };
    } catch (error) {
      requestResponder?.error({
        json: 'attributes' in error ? error.attributes : { message: error.message },
      });
      return formatAndRethrowEsqlError(error);
    }
  }

  /**
   * Execute a DSL (Elasticsearch Query DSL) search
   */
  async dsl(params: IDslSearchParams, options?: IDslSearchOptions): Promise<IDslSearchResult> {
    const dslParams = params.kibanaQueryContext
      ? await this.applyDslKibanaQueryContext(params)
      : params;
    const request = this.buildDslRequest(dslParams, options);
    const searchOptions = this.mapDslOptions(options, params);

    const requestResponder = options?.inspector?.adapter.start(options.inspector.title, {
      description: options.inspector.description,
      searchSessionId: searchOptions?.sessionId,
    });

    requestResponder?.json((request.params?.body ?? {}) as Record<string, unknown>);
    if (options?.inspector?.getRequestStats) {
      requestResponder?.stats(options.inspector.getRequestStats());
    } else if (params.index && typeof params.index === 'object') {
      requestResponder?.stats(getDslRequestInspectorStats(params.index));
    }

    try {
      const response = await this.executeSearch(request, searchOptions);

      requestResponder?.stats(getDslResponseInspectorStats(response.rawResponse));
      requestResponder?.ok({
        json: { rawResponse: response.rawResponse },
        requestParams: response.requestParams,
      });

      return {
        rawResponse: response.rawResponse,
      };
    } catch (error) {
      requestResponder?.error({
        json: 'attributes' in error ? error.attributes : { message: error.message },
      });
      throw error;
    }
  }

  /**
   * Execute a paginated DSL (Elasticsearch Query DSL) search with pagination helpers
   */
  async dslPaginated(
    params: IDslPaginatedSearchParams,
    options?: IDslPaginatedSearchOptions
  ): Promise<IDslPaginatedSearchResult> {
    // trackTotalHits is required for pagination to determine if there are more pages
    const paginatedParams = { ...params, trackTotalHits: true as const };
    const request = this.buildDslRequest(paginatedParams, options);
    const response = await this.executeSearch(
      request,
      this.mapDslOptions(options, paginatedParams)
    );

    return {
      rawResponse: response.rawResponse,
      pagination: this.buildDslPagination(response.rawResponse, params, options),
    };
  }

  /**
   * Execute an EQL (Event Query Language) search
   */
  async eql(params: IEqlSearchParams, options?: IEqlSearchOptions): Promise<IEqlSearchResult> {
    const request = this.buildEqlRequest(params, options);
    const searchOptions = this.mapEqlOptions(options, 'eql' as typeof EQL_SEARCH_STRATEGY);

    const requestResponder = options?.inspector?.adapter.start(options.inspector.title, {
      description: options.inspector.description,
      searchSessionId: searchOptions?.sessionId,
    });

    requestResponder?.json((request.params?.body ?? {}) as Record<string, unknown>);
    if (options?.inspector?.getRequestStats) {
      requestResponder?.stats(options.inspector.getRequestStats());
    }

    try {
      const response = await this.executeSearch(request, searchOptions);

      requestResponder?.ok({
        json: { rawResponse: response.rawResponse },
        requestParams: response.requestParams,
      });

      return {
        rawResponse: response.rawResponse,
      };
    } catch (error) {
      requestResponder?.error({
        json: 'attributes' in error ? error.attributes : { message: error.message },
      });
      throw error;
    }
  }

  /**
   * Execute a SQL search
   */
  async sql(params: ISqlSearchParams, options?: ISqlSearchOptions): Promise<ISqlSearchResult> {
    const request = this.buildSqlRequest(params, options);
    const searchOptions = this.mapSqlOptions(options, 'sql' as typeof SQL_SEARCH_STRATEGY);

    const requestResponder = options?.inspector?.adapter.start(options.inspector.title, {
      description: options.inspector.description,
      searchSessionId: searchOptions?.sessionId,
    });

    requestResponder?.json((request.params?.body ?? {}) as Record<string, unknown>);
    if (options?.inspector?.getRequestStats) {
      requestResponder?.stats(options.inspector.getRequestStats());
    }

    try {
      const response = await this.executeSearch(request, searchOptions);

      requestResponder?.stats(getSqlInspectorStats(response.rawResponse, response.took));
      requestResponder?.ok({
        json: { rawResponse: response.rawResponse },
        requestParams: response.requestParams,
      });

      return {
        rawResponse: response.rawResponse,
        took: response.took,
      };
    } catch (error) {
      requestResponder?.error({
        json: 'attributes' in error ? error.attributes : { message: error.message },
      });
      throw error;
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Execute a search request using the search function and convert Observable to Promise
   */
  private async executeSearch<T extends IKibanaSearchRequest>(
    request: T,
    options: ISearchOptions
  ): Promise<any> {
    const response$ = this.search(request, options);
    return lastValueFrom(response$.pipe(takeWhile((r) => r.isRunning === true, true)));
  }

  // ============================================================================
  // DSL Search Helpers
  // ============================================================================

  private async applyDslKibanaQueryContext(params: IDslSearchParams): Promise<IDslSearchParams> {
    const {
      timeRange,
      timeField,
      kibanaFilters = [],
      kqlQuery,
    } = params.kibanaQueryContext as KibanaQueryContext;
    const esQueryConfig = await this.deps.getEsQueryConfig();

    const timeFilter = timeRange && getTime(undefined, timeRange, { fieldName: timeField });
    const contextFilters = [...kibanaFilters, ...(timeFilter ? [timeFilter] : [])];
    const contextQueries = castArray(kqlQuery ?? []).filter(isOfQueryType);

    if (!contextFilters.length && !contextQueries.length) {
      return params;
    }

    const contextQuery = buildEsQuery(undefined, contextQueries, contextFilters, esQueryConfig);
    if (params.query) {
      contextQuery.bool.must.push(params.query);
    }

    return { ...params, query: contextQuery };
  }

  private buildDslRequest(params: IDslSearchParams, options?: IDslSearchOptions): IEsSearchRequest {
    const {
      index: _,
      query,
      aggs,
      size,
      sort,
      fields,
      _source,
      runtimeMappings,
      highlight,
      kibanaQueryContext: _kibanaQueryContext,
      trackTotalHits,
      ...rest
    } = params;
    const body: Record<string, any> = {
      query,
      aggs,
      size,
      sort,
      fields,
      _source,
      runtime_mappings: runtimeMappings,
      highlight,
      // Allow any additional parameters for safe backwards compatibility in the DSL expression function
      // It could make sense to lock this down further if we get more confident or if expression functions
      // can no longer be used directly in Canvas
      ...rest,
      track_total_hits: trackTotalHits,
    };

    return {
      params: {
        index: typeof params.index === 'string' ? params.index : params.index.getIndexPattern(),
        body,
      },
    };
  }

  private mapDslOptions(options?: IDslSearchOptions, params?: IDslSearchParams): ISearchOptions {
    return {
      ...this.mapBaseOptions(options),
      strategy: 'ese' as typeof ENHANCED_ES_SEARCH_STRATEGY,
      indexPattern: typeof params?.index === 'object' ? params.index : undefined,
    };
  }

  private buildDslPagination(
    rawResponse: any,
    originalParams: IDslSearchParams,
    options?: IDslSearchOptions
  ): IDslPagination {
    const self = this;
    const lastHit = rawResponse.hits?.hits?.at?.(-1);
    const currentCount = rawResponse.hits?.hits?.length ?? 0;
    const totalValue =
      typeof rawResponse.hits?.total === 'number'
        ? rawResponse.hits.total
        : rawResponse.hits?.total?.value ?? 0;
    const hasNextPage = Boolean(lastHit?.sort) && totalValue > currentCount;

    return {
      hasNextPage,
      nextPage: async (): Promise<IDslPaginatedSearchResult | null> => {
        if (!hasNextPage || !lastHit?.sort) {
          return null;
        }

        // Build next search with search_after
        const nextParams: IDslSearchParams = {
          ...originalParams,
        };

        const request = self.buildDslRequest(nextParams, options);
        if (request.params && typeof request.params !== 'string') {
          (request.params as any).body.search_after = lastHit.sort;
        }

        const nextResponse = await self.executeSearch(request, self.mapDslOptions(options));

        return {
          rawResponse: nextResponse.rawResponse,
          pagination: self.buildDslPagination(nextResponse.rawResponse, nextParams, options),
        };
      },
    };
  }

  // ============================================================================
  // ES|QL Search Helpers
  // ============================================================================

  private buildEsqlRequest(params: IEsqlSearchParams): IKibanaSearchRequest<ESQLSearchParams> {
    return {
      params: {
        query: params.query,
        params: params.params as any,
        filter: params.filter as any,
        time_zone: params.timeZone,
        locale: params.locale,
        dropNullColumns: params.dropNullColumns,
        include_execution_metadata: params.includeExecutionMetadata,
        ...(params.columnMetadata ? { settings: { column_metadata: true } } : {}),
      },
    };
  }

  private async applyEsqlSearchContext(params: IEsqlSearchParams): Promise<IEsqlSearchParams> {
    const {
      timeRange,
      timeField,
      kibanaFilters = [],
      kqlQuery,
      esqlVariables = [],
    } = params.kibanaQueryContext ?? {};
    const esQueryConfig = await this.deps.getEsQueryConfig();

    // this is for backward compatibility, if the query is of fields or functions type
    // and the query is not set with ?? in the query, we should set it
    // https://github.com/elastic/elasticsearch/pull/122459
    const esqlQuery = fixESQLQueryWithVariables(params.query, esqlVariables);

    const timeFilter = timeRange && getTime(undefined, timeRange, { fieldName: timeField });
    const contextFilters = [...kibanaFilters, ...(timeFilter ? [timeFilter] : [])];
    const contextQueries = castArray(kqlQuery ?? []).filter(isOfQueryType);
    const contextFilter =
      contextFilters.length || contextQueries.length
        ? buildEsQuery(undefined, contextQueries, contextFilters, esQueryConfig)
        : undefined;

    // ES|QL does not allow mixing positional and named params, so context params are only
    // valid alongside named params from the caller
    const namedParams = [
      ...(params.params ?? []),
      ...(getNamedParams(esqlQuery, timeRange, esqlVariables) ?? []),
    ] as NonNullable<IEsqlSearchParams['params']>;

    return {
      ...params,
      query: esqlQuery,
      params: namedParams.length ? namedParams : undefined,
      filter: this.mergeEsqlFilters(contextFilter, params.filter),
      timeZone:
        params.timeZone ??
        (esQueryConfig.dateFormatTZ ? getTimeZoneFromSettings(esQueryConfig.dateFormatTZ) : 'UTC'),
    };
  }

  private mergeEsqlFilters(
    contextFilter: ReturnType<typeof buildEsQuery> | undefined,
    filter: IEsqlSearchParams['filter']
  ): IEsqlSearchParams['filter'] {
    if (!contextFilter || !filter) {
      return contextFilter ?? filter;
    }

    return {
      bool: {
        ...contextFilter.bool,
        filter: [...contextFilter.bool.filter, ...castArray(filter)],
      },
    };
  }

  private mapEsqlOptions(
    options: IEsqlSearchOptions | undefined,
    params: IEsqlSearchParams,
    strategy: typeof ESQL_ASYNC_SEARCH_STRATEGY
  ): ISearchOptions {
    return {
      ...this.mapBaseOptions(options),
      approximation: params.approximation,
      strategy,
    };
  }

  // ============================================================================
  // EQL Search Helpers
  // ============================================================================

  private buildEqlRequest(params: IEqlSearchParams, options?: IEqlSearchOptions): IEsSearchRequest {
    return {
      params: {
        index: typeof params.index === 'string' ? params.index : params.index.getIndexPattern(),
        body: {
          query: params.query as any,
          filter: params.filter as any,
          size: params.size as any,
          fields: params.fields as any,
          runtime_mappings: params.runtimeMappings as any,
          event_category_field: options?.eventCategoryField as any,
          timestamp_field: options?.timestampField as any,
          tiebreaker_field: options?.tiebreakerField as any,
        },
      },
    };
  }

  private mapEqlOptions(
    options: IEqlSearchOptions | undefined,
    strategy: typeof EQL_SEARCH_STRATEGY
  ): ISearchOptions {
    return {
      ...this.mapBaseOptions(options),
      strategy,
    };
  }

  // ============================================================================
  // SQL Search Helpers
  // ============================================================================

  private buildSqlRequest(params: ISqlSearchParams, options?: ISqlSearchOptions): IEsSearchRequest {
    return {
      params: {
        body: {
          query: params.query,
          params: params.params,
          fetch_size: params.fetchSize,
          filter: params.filter,
          time_zone: options?.timeZone,
        } as any,
      },
    };
  }

  private mapSqlOptions(
    options: ISqlSearchOptions | undefined,
    strategy: typeof SQL_SEARCH_STRATEGY
  ): ISearchOptions {
    return {
      ...this.mapBaseOptions(options),
      strategy,
    };
  }

  // ============================================================================
  // Common Helpers
  // ============================================================================

  private mapBaseOptions(options?: IBaseSearchOptions): Partial<ISearchOptions> {
    if (!options) {
      return {};
    }

    return {
      abortSignal: options.abortSignal,
      sessionId: options.sessionId,
      executionContext: options.executionContext,
      projectRouting: options.projectRouting,
    };
  }
}
