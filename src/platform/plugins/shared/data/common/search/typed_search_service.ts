/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lastValueFrom, takeWhile } from 'rxjs';
import type {
  ITypedSearchService,
  IDSLSearchParams,
  IDSLSearchOptions,
  IDSLSearchResult,
  IDSLPagination,
  IESQLSearchParams,
  IESQLSearchOptions,
  IESQLSearchResult,
  IEQLSearchParams,
  IEQLSearchOptions,
  IEQLSearchResult,
  ISQLSearchParams,
  ISQLSearchOptions,
  ISQLSearchResult,
  IBaseSearchOptions,
  ISearchOptions,
  IEsSearchRequest,
  IKibanaSearchRequest,
  ISearchGeneric,
} from '@kbn/search-types';
import type { ESQLSearchParams } from '@kbn/es-types';
import type {
  ENHANCED_ES_SEARCH_STRATEGY,
  ESQL_ASYNC_SEARCH_STRATEGY,
  EQL_SEARCH_STRATEGY,
  SQL_SEARCH_STRATEGY,
} from '.';

/**
 * TypedSearchService provides strategy-specific search methods with type-safe
 * parameters, invisible polling, and built-in pagination support.
 *
 * This is a common abstraction that works on both client and server by accepting
 * a generic search function that converts Observable-based searches to Promise-based
 * searches and adds pagination helpers for DSL searches using search_after.
 */
export class TypedSearchService implements ITypedSearchService {
  constructor(private readonly search: ISearchGeneric) {}

  /**
   * Execute an ES|QL search
   */
  async searchESQL(
    params: IESQLSearchParams,
    options?: IESQLSearchOptions
  ): Promise<IESQLSearchResult> {
    const request = this.buildESQLRequest(params, options);
    const response = await this.executeSearch(
      request,
      this.mapESQLOptions(options, 'esql_async' as typeof ESQL_ASYNC_SEARCH_STRATEGY)
    );
    return { rawResponse: response.rawResponse, requestParams: response.requestParams };
  }

  /**
   * Execute a DSL (Elasticsearch Query DSL) search with pagination
   */
  searchDSL(
    params: IDSLSearchParams,
    options: IDSLSearchOptions & { paginate: true }
  ): Promise<IDSLSearchResult & { pagination: IDSLPagination }>;

  /**
   * Execute a DSL (Elasticsearch Query DSL) search without pagination
   */
  searchDSL(
    params: IDSLSearchParams,
    options?: IDSLSearchOptions
  ): Promise<IDSLSearchResult & { pagination: never }>;

  async searchDSL(
    params: IDSLSearchParams,
    options?: IDSLSearchOptions
  ): Promise<IDSLSearchResult> {
    const request = this.buildDSLRequest(params, options);
    const response = await this.executeSearch(request, this.mapDSLOptions(options, params));

    const result: IDSLSearchResult = {
      rawResponse: response.rawResponse,
      requestParams: response.requestParams,
    };

    // Add pagination helpers if requested
    if (options?.paginate) {
      result.pagination = this.buildDSLPagination(response.rawResponse, params, options);
    }

    return result;
  }

  /**
   * Execute an EQL (Event Query Language) search
   */
  async searchEQL(
    params: IEQLSearchParams,
    options?: IEQLSearchOptions
  ): Promise<IEQLSearchResult> {
    const request = this.buildEQLRequest(params, options);
    const response = await this.executeSearch(
      request,
      this.mapEQLOptions(options, 'eql' as typeof EQL_SEARCH_STRATEGY)
    );
    return { rawResponse: response.rawResponse, requestParams: response.requestParams };
  }

  /**
   * Execute a SQL search
   */
  async searchSQL(
    params: ISQLSearchParams,
    options?: ISQLSearchOptions
  ): Promise<ISQLSearchResult> {
    const request = this.buildSQLRequest(params, options);
    const response = await this.executeSearch(
      request,
      this.mapSQLOptions(options, 'sql' as typeof SQL_SEARCH_STRATEGY)
    );
    return {
      rawResponse: response.rawResponse,
      took: response.took,
      requestParams: response.requestParams,
    };
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

    // Wait for final result (when isRunning becomes false)
    const finalResponse = await lastValueFrom(
      response$.pipe(takeWhile((r) => r.isRunning === true, true))
    );

    return finalResponse;
  }

  // ============================================================================
  // DSL Search Helpers
  // ============================================================================

  private buildDSLRequest(params: IDSLSearchParams, options?: IDSLSearchOptions): IEsSearchRequest {
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
      track_total_hits: options?.trackTotalHits,
      // Allow any additional parameters for safe backwards compatibility in the DSL expression function
      // It could make sense to lock this down further if we get more confident or if expression functions
      // can no longer be used directly in Canvas
      ...rest,
    };

    return {
      params: {
        index: typeof params.index === 'string' ? params.index : params.index.getIndexPattern(),
        body,
      },
    };
  }

  private mapDSLOptions(options?: IDSLSearchOptions, params?: IDSLSearchParams): ISearchOptions {
    return {
      ...this.mapBaseOptions(options),
      strategy: 'ese' as typeof ENHANCED_ES_SEARCH_STRATEGY,
      legacyHitsTotal: options?.legacyHitsTotal,
      indexPattern: typeof params?.index === 'object' ? params.index : undefined,
    };
  }

  private buildDSLPagination(
    rawResponse: any,
    originalParams: IDSLSearchParams,
    options: IDSLSearchOptions
  ): IDSLPagination {
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
      nextPage: async (pageOptions): Promise<IDSLSearchResult | null> => {
        const { abortSignal, executionContext } = pageOptions ?? {};

        if (!hasNextPage || !lastHit?.sort) {
          return null;
        }

        // Strip session ID for pagination calls (pagination fetches shouldn't be cached)
        const paginationOptions = {
          ...options,
          abortSignal,
          executionContext: executionContext ?? options.executionContext,
          // Strip session ID for pagination calls (pagination fetches shouldn't be cached)
          sessionId: undefined,
        };

        // Build next search with search_after
        const nextParams: IDSLSearchParams = {
          ...originalParams,
        };

        const request = self.buildDSLRequest(nextParams, paginationOptions);
        if (request.params && typeof request.params !== 'string') {
          (request.params as any).body.search_after = lastHit.sort;
        }

        const nextResponse = await self.executeSearch(
          request,
          self.mapDSLOptions(paginationOptions)
        );

        return {
          rawResponse: nextResponse.rawResponse,
          requestParams: nextResponse.requestParams,
          pagination: self.buildDSLPagination(
            nextResponse.rawResponse,
            nextParams,
            paginationOptions
          ),
        };
      },
      async *getAllPages(maxPages = 100) {
        let currentResult: IDSLSearchResult = {
          rawResponse,
          requestParams: undefined,
          pagination: self.buildDSLPagination(rawResponse, originalParams, options),
        };
        let pageCount = 1;

        yield currentResult;

        while (currentResult.pagination?.hasNextPage && pageCount < maxPages) {
          const nextResult = await currentResult.pagination.nextPage();
          if (!nextResult) break;
          currentResult = nextResult as IDSLSearchResult;
          pageCount++;
          yield currentResult;
        }
      },
    };
  }

  // ============================================================================
  // ES|QL Search Helpers
  // ============================================================================

  private buildESQLRequest(
    params: IESQLSearchParams,
    options?: IESQLSearchOptions
  ): IKibanaSearchRequest<ESQLSearchParams> {
    return {
      params: {
        query: params.query,
        params: params.params as any,
        filter: params.filter as any,
        time_zone: params.timeZone,
        locale: params.locale,
        dropNullColumns: options?.dropNullColumns,
        include_execution_metadata: options?.includeExecutionMetadata,
      },
    };
  }

  private mapESQLOptions(
    options: IESQLSearchOptions | undefined,
    strategy: typeof ESQL_ASYNC_SEARCH_STRATEGY
  ): ISearchOptions {
    return {
      ...this.mapBaseOptions(options),
      strategy,
    };
  }

  // ============================================================================
  // EQL Search Helpers
  // ============================================================================

  private buildEQLRequest(params: IEQLSearchParams, options?: IEQLSearchOptions): IEsSearchRequest {
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

  private mapEQLOptions(
    options: IEQLSearchOptions | undefined,
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

  private buildSQLRequest(params: ISQLSearchParams, options?: ISQLSearchOptions): IEsSearchRequest {
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

  private mapSQLOptions(
    options: ISQLSearchOptions | undefined,
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
