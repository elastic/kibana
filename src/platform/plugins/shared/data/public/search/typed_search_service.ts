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
} from '@kbn/search-types';
import type {
  ENHANCED_ES_SEARCH_STRATEGY,
  ESQL_ASYNC_SEARCH_STRATEGY,
  EQL_SEARCH_STRATEGY,
  SQL_SEARCH_STRATEGY,
} from '../../common';
import type { ISearchInterceptor } from './search_interceptor';

/**
 * TypedSearchService provides strategy-specific search methods with type-safe
 * parameters, invisible polling, and built-in pagination support.
 *
 * This is a client-side abstraction over the existing SearchInterceptor that
 * converts Observable-based searches to Promise-based searches and adds
 * pagination helpers for DSL searches using search_after.
 */
export class TypedSearchService implements ITypedSearchService {
  constructor(private readonly searchInterceptor: ISearchInterceptor) {}

  /**
   * Execute an ES|QL search
   */
  async searchESQL(
    params: IESQLSearchParams,
    options?: IESQLSearchOptions
  ): Promise<IESQLSearchResult> {
    const request = this.buildESQLRequest(params);
    const rawResponse = await this.executeSearch(
      request,
      this.mapESQLOptions(options, 'esql_async' as typeof ESQL_ASYNC_SEARCH_STRATEGY)
    );
    return { rawResponse };
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
    const request = this.buildDSLRequest(params);
    const rawResponse = await this.executeSearch(request, this.mapDSLOptions(options));

    const result: IDSLSearchResult = { rawResponse };

    // Add pagination helpers if requested
    if (options?.paginate) {
      result.pagination = this.buildDSLPagination(rawResponse, params, options);
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
    const request = this.buildEQLRequest(params);
    const rawResponse = await this.executeSearch(
      request,
      this.mapEQLOptions(options, 'eql' as typeof EQL_SEARCH_STRATEGY)
    );
    return { rawResponse };
  }

  /**
   * Execute a SQL search
   */
  async searchSQL(
    params: ISQLSearchParams,
    options?: ISQLSearchOptions
  ): Promise<ISQLSearchResult> {
    const request = this.buildSQLRequest(params);
    const rawResponse = await this.executeSearch(
      request,
      this.mapSQLOptions(options, 'sql' as typeof SQL_SEARCH_STRATEGY)
    );
    return { rawResponse };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Execute a search request using the SearchInterceptor and convert Observable to Promise
   */
  private async executeSearch(request: IEsSearchRequest, options: ISearchOptions): Promise<any> {
    const response$ = this.searchInterceptor.search(request, options);

    // Wait for final result (when isRunning becomes false)
    const finalResponse = await lastValueFrom(
      response$.pipe(takeWhile((r) => r.isRunning === true, true))
    );

    return finalResponse.rawResponse;
  }

  // ============================================================================
  // DSL Search Helpers
  // ============================================================================

  private buildDSLRequest(params: IDSLSearchParams): IEsSearchRequest {
    const body: Record<string, any> = {
      query: params.query,
      aggs: params.aggs,
      size: params.size,
      sort: params.sort,
      fields: params.fields,
      _source: params._source,
      runtime_mappings: params.runtimeMappings,
      highlight: params.highlight,
    };

    return {
      params: {
        index: params.index,
        body,
      },
    };
  }

  private mapDSLOptions(options?: IDSLSearchOptions): ISearchOptions {
    return {
      ...this.mapBaseOptions(options),
      strategy: 'ese' as typeof ENHANCED_ES_SEARCH_STRATEGY,
      legacyHitsTotal: options?.legacyHitsTotal,
      indexPattern: options?.dataView,
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
      nextPage: async (): Promise<IDSLSearchResult | null> => {
        if (!hasNextPage || !lastHit?.sort) {
          return null;
        }

        // Build next search with search_after
        const nextParams: IDSLSearchParams = {
          ...originalParams,
        };

        const request = self.buildDSLRequest(nextParams);
        if (request.params && typeof request.params !== 'string') {
          (request.params as any).body.search_after = lastHit.sort;
        }

        const nextRawResponse = await self.executeSearch(request, self.mapDSLOptions(options));

        return {
          rawResponse: nextRawResponse,
          pagination: self.buildDSLPagination(nextRawResponse, nextParams, options),
        };
      },
      async *getAllPages(maxPages = 100) {
        let currentResult: IDSLSearchResult = {
          rawResponse,
          pagination: self.buildDSLPagination(rawResponse, originalParams, options),
        };
        let pageCount = 1;

        yield currentResult;

        while (currentResult.pagination?.hasNextPage && pageCount < maxPages) {
          const nextResult = await currentResult.pagination.nextPage();
          if (!nextResult) break;
          currentResult = nextResult;
          pageCount++;
          yield currentResult;
        }
      },
    };
  }

  // ============================================================================
  // ES|QL Search Helpers
  // ============================================================================

  private buildESQLRequest(params: IESQLSearchParams): IEsSearchRequest {
    return {
      params: {
        body: {
          query: params.query,
          params: params.params,
          limit: params.limit,
          filter: params.filter,
          time_zone: params.timeZone,
          locale: params.locale,
        } as any,
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
      // ES|QL specific options would go here
    };
  }

  // ============================================================================
  // EQL Search Helpers
  // ============================================================================

  private buildEQLRequest(params: IEQLSearchParams): IEsSearchRequest {
    return {
      params: {
        index: params.index,
        body: {
          query: params.query as any,
          filter: params.filter as any,
          size: params.size as any,
          fields: params.fields as any,
          runtime_mappings: params.runtimeMappings as any,
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

  private buildSQLRequest(params: ISQLSearchParams): IEsSearchRequest {
    return {
      params: {
        body: {
          query: params.query,
          params: params.params,
          fetch_size: params.fetchSize,
          filter: params.filter,
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
