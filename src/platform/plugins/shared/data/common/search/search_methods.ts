/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lastValueFrom, takeWhile } from 'rxjs';
import { i18n } from '@kbn/i18n';
import type {
  ISearchMethods,
  IDslSearchParams,
  IDslSearchOptions,
  IDslSearchResult,
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
} from '@kbn/search-types';
import type { ESQLSearchParams } from '@kbn/es-types';
import type {
  ENHANCED_ES_SEARCH_STRATEGY,
  ESQL_ASYNC_SEARCH_STRATEGY,
  EQL_SEARCH_STRATEGY,
  SQL_SEARCH_STRATEGY,
} from '.';
import {
  getResponseInspectorStats,
  getEsqlInspectorStats,
} from './search_source/inspect/inspector_stats';

/**
 * SearchMethodsService provides strategy-specific search methods with type-safe
 * parameters, invisible polling, and built-in pagination support.
 *
 * This is a common abstraction that works on both client and server by accepting
 * a generic search function that converts Observable-based searches to Promise-based
 * searches and adds pagination helpers for DSL searches using search_after.
 */
export class SearchMethodsService implements ISearchMethods {
  constructor(private readonly search: ISearchGeneric) {}

  /**
   * Execute an ES|QL search
   */
  async esql(params: IEsqlSearchParams, options?: IEsqlSearchOptions): Promise<IEsqlSearchResult> {
    const request = this.buildEsqlRequest(params, options);

    // Enhance inspector config with response stats
    const inspector = options?.inspector
      ? {
          ...options.inspector,
          getResponseStats:
            options.inspector.getResponseStats ??
            ((result: any) => getEsqlInspectorStats(result.rawResponse)),
        }
      : undefined;

    const response = await this.executeSearch(
      request,
      this.mapEsqlOptions(options, 'esql_async' as typeof ESQL_ASYNC_SEARCH_STRATEGY),
      inspector,
      (req) => (req.params ?? {}) as Record<string, unknown>
    );
    return {
      rawResponse: response.rawResponse,
    };
  }

  /**
   * Execute a DSL (Elasticsearch Query DSL) search
   */
  async dsl(params: IDslSearchParams, options?: IDslSearchOptions): Promise<IDslSearchResult> {
    const request = this.buildDslRequest(params, options);

    // Enhance inspector config with response stats
    const inspector = options?.inspector
      ? {
          ...options.inspector,
          getResponseStats:
            options.inspector.getResponseStats ??
            ((result: any) => getResponseInspectorStats(result.rawResponse)),
        }
      : undefined;

    const response = await this.executeSearch(
      request,
      this.mapDslOptions(options, params),
      inspector,
      (req) => (req.params?.body ?? {}) as Record<string, unknown>
    );
    return {
      rawResponse: response.rawResponse,
    };
  }

  /**
   * Execute a paginated DSL (Elasticsearch Query DSL) search with pagination helpers
   */
  async dslPaginated(
    params: IDslSearchParams,
    _options?: Omit<IDslSearchOptions, 'trackTotalHits'>
  ): Promise<IDslPaginatedSearchResult> {
    const options = {
      ..._options,
      // trackTotalHits is required for pagination to determine if there are more pages
      trackTotalHits: true,
    };
    const request = this.buildDslRequest(params, options);
    const response = await this.executeSearch(
      request,
      this.mapDslOptions(options, params),
      undefined,
      () => ({})
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
    const response = await this.executeSearch(
      request,
      this.mapEqlOptions(options, 'eql' as typeof EQL_SEARCH_STRATEGY),
      options?.inspector,
      (req) => (req.params?.body ?? {}) as Record<string, unknown>
    );
    return {
      rawResponse: response.rawResponse,
    };
  }

  /**
   * Execute a SQL search
   */
  async sql(params: ISqlSearchParams, options?: ISqlSearchOptions): Promise<ISqlSearchResult> {
    const request = this.buildSqlRequest(params, options);

    // Enhance inspector config with response stats
    const inspector = options?.inspector
      ? {
          ...options.inspector,
          getResponseStats:
            options.inspector.getResponseStats ??
            ((result: any) => ({
              hits: {
                label: i18n.translate('data.search.es_search.hitsLabel', {
                  defaultMessage: 'Hits',
                }),
                value: `${result.rawResponse.rows?.length ?? 0}`,
                description: i18n.translate('data.search.es_search.hitsDescription', {
                  defaultMessage: 'The number of documents returned by the query.',
                }),
              },
              queryTime: {
                label: i18n.translate('data.search.es_search.queryTimeLabel', {
                  defaultMessage: 'Query time',
                }),
                value: i18n.translate('data.search.es_search.queryTimeValue', {
                  defaultMessage: '{queryTime}ms',
                  values: { queryTime: result.took },
                }),
                description: i18n.translate('data.search.es_search.queryTimeDescription', {
                  defaultMessage:
                    'The time it took to process the query. ' +
                    'Does not include the time to send the request or parse it in the browser.',
                }),
              },
            })),
        }
      : undefined;

    const response = await this.executeSearch(
      request,
      this.mapSqlOptions(options, 'sql' as typeof SQL_SEARCH_STRATEGY),
      inspector,
      (req) => (req.params?.body ?? {}) as Record<string, unknown>
    );
    return {
      rawResponse: response.rawResponse,
      took: response.took,
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
    options: ISearchOptions,
    inspector: IBaseSearchOptions['inspector'],
    getRequestBody: (request: T) => Record<string, unknown>
  ): Promise<any> {
    const requestResponder = inspector?.adapter?.start(inspector.title, {
      id: inspector.id,
      description: inspector.description,
      searchSessionId: options?.sessionId,
    });

    // Log request body if inspector is active
    if (requestResponder) {
      requestResponder.json(getRequestBody(request));
      // Log request metadata before executing search
      if (inspector?.getRequestStats) {
        requestResponder.stats(inspector.getRequestStats());
      }
    }

    try {
      const response$ = this.search(request, options);
      const result = await lastValueFrom(
        response$.pipe(takeWhile((r) => r.isRunning === true, true))
      );

      if (requestResponder) {
        if (inspector?.getResponseStats) {
          requestResponder.stats(inspector.getResponseStats(result));
        }
        requestResponder.ok({
          json: { rawResponse: result.rawResponse },
          requestParams: result.requestParams,
        });
      }

      return result;
    } catch (error) {
      if (requestResponder) {
        requestResponder.error({
          json: 'attributes' in error ? error.attributes : { message: error.message },
        });
      }
      throw error;
    }
  }

  // ============================================================================
  // DSL Search Helpers
  // ============================================================================

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
      track_total_hits: options?.trackTotalHits,
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

        const nextResponse = await self.executeSearch(
          request,
          self.mapDslOptions(options),
          undefined,
          (req) => (req.params?.body ?? {}) as Record<string, unknown>
        );

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

  private buildEsqlRequest(
    params: IEsqlSearchParams,
    options?: IEsqlSearchOptions
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

  private mapEsqlOptions(
    options: IEsqlSearchOptions | undefined,
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
