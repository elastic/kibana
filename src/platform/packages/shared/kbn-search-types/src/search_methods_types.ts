/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { KibanaExecutionContext } from '@kbn/core/public';
import type { AbstractDataView } from '@kbn/data-views-plugin/common';
import type { AggregateQuery, Filter, ProjectRouting, Query, TimeRange } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { ESQLSearchParams } from '@kbn/es-types';
import type { RequestAdapter, RequestStatistics } from '@kbn/inspector-plugin/common';

/**
 * Base options shared across all typed search methods
 */
export interface IBaseSearchOptions {
  /**
   * An `AbortSignal` that allows the caller to abort a search request.
   */
  abortSignal?: AbortSignal;

  /**
   * A background search ID.
   */
  sessionId?: string;

  /**
   * Represents meta-information about a Kibana entity initiating a search request.
   */
  executionContext?: KibanaExecutionContext;

  /**
   * Project routing configuration for cross-project search (CPS).
   */
  projectRouting?: ProjectRouting;

  /**
   * Inspector integration options for tracking requests
   */
  inspector?: {
    adapter: RequestAdapter;
    title: string;
    description?: string;
    getRequestStats?: () => RequestStatistics;
  };
}

// ============================================================================
// DSL Search Types
// ============================================================================

/**
 * Parameters for DSL (Elasticsearch Query DSL) search
 */
export interface IDslSearchParams {
  /**
   * Index pattern to search
   */
  index: string | AbstractDataView;

  /**
   * Query DSL query
   */
  query?: estypes.QueryDslQueryContainer;

  /**
   * Aggregations to compute
   */
  aggs?: Record<string, estypes.AggregationsAggregationContainer>;

  /**
   * Maximum number of hits to return
   */
  size?: number;

  /**
   * Sort specification
   */
  sort?: estypes.Sort;

  /**
   * Fields to retrieve
   */
  fields?: estypes.Fields;

  /**
   * Source filtering
   */
  _source?: estypes.SearchSourceConfig;

  /**
   * Runtime field mappings
   */
  runtimeMappings?: estypes.MappingRuntimeFields;

  /**
   * Highlight configuration
   */
  highlight?: estypes.SearchHighlight;

  /**
   * Kibana query context to apply. The time range, Kibana filters, and KQL/Lucene query are
   * compiled into a DSL bool query and merged with `query`.
   */
  kibanaQueryContext?: KibanaQueryContext;

  /**
   * Control total hits counting precision
   */
  trackTotalHits?: boolean | number;

  /**
   * Allow any additional SearchRequest body properties for maximum compatibility
   */
  [key: string]: unknown;
}

/**
 * Options specific to DSL search. `params` shapes the query; `options` is Kibana plumbing
 * (session, inspector, abort, execution context, project routing).
 */
export type IDslSearchOptions = IBaseSearchOptions;

export type IDslPaginatedSearchParams = IDslSearchParams & Required<Pick<IDslSearchParams, 'sort'>>;

export type IDslPaginatedSearchOptions = IBaseSearchOptions;

/**
 * Pagination helpers for DSL search results
 */
export interface IDslPagination {
  /**
   * Whether more results are available
   */
  hasNextPage: boolean;

  /**
   * Fetch the next page of results using search_after
   */
  nextPage: () => Promise<IDslPaginatedSearchResult | null>;
}

/**
 * Result from a DSL search
 */
export interface IDslSearchResult {
  /**
   * Raw Elasticsearch search response
   */
  rawResponse: estypes.SearchResponse;
}

/**
 * Result from a paginated DSL search
 */
export interface IDslPaginatedSearchResult {
  /**
   * Raw Elasticsearch search response
   */
  rawResponse: estypes.SearchResponse;
  /**
   * Pagination helpers for navigating through result pages
   */
  pagination: IDslPagination;
}

// ============================================================================
// ES|QL Search Types
// ============================================================================

/**
 * Kibana query context to apply when calling a search method. The shape matches the corresponding
 * fields of a dashboard panel's fetch context, so it can be passed through directly.
 */
export interface KibanaQueryContext {
  /**
   * Time range to restrict the search to. Adds a range filter on `timeField`.
   */
  timeRange?: TimeRange;

  /**
   * The date field to filter `timeRange` on.
   */
  timeField?: string;

  /**
   * Kibana filters to apply.
   */
  kibanaFilters?: Filter[];

  /**
   * KQL or Lucene query to apply. ES|QL (aggregate) queries are ignored.
   */
  kqlQuery?: Query | Query[] | AggregateQuery;
}

/**
 * ES|QL-specific extension of {@link KibanaQueryContext} that adds control variable support.
 * For ES|QL, `timeRange` also fills the `?_tstart` and `?_tend` named params; without a
 * `timeField` the time range is only applied through those params.
 */
export interface EsqlKibanaQueryContext extends KibanaQueryContext {
  /**
   * ES|QL control variables. Values for variables used in the query are added as named params.
   */
  esqlVariables?: ESQLControlVariable[];
}

/**
 * Parameters for ES|QL search
 */
export interface IEsqlSearchParams {
  /**
   * ES|QL query string
   */
  query: string;

  /**
   * Query parameters for parameterized queries
   */
  params?: ESQLSearchParams['params'];

  /**
   * Raw DSL filter to apply. AND-combined with the filter built from `kibanaQueryContext`
   * when that is provided.
   */
  filter?: estypes.QueryDslQueryContainer | estypes.QueryDslQueryContainer[];

  /**
   * Time zone for date calculations. Defaults to the `dateFormat:tz` advanced setting.
   */
  timeZone?: string;

  /**
   * Locale for string operations
   */
  locale?: string;

  /**
   * Kibana query context (time range, filters, query bar, ES|QL controls) to apply.
   * These are Kibana abstractions that get compiled into the ES request body.
   * Pass the matching fields from a dashboard panel's fetch context directly.
   */
  kibanaQueryContext?: EsqlKibanaQueryContext;

  // ── ES|QL-specific request flags ──────────────────────────────────────────

  /**
   * Drop columns that only contain null values
   */
  dropNullColumns?: boolean;

  /**
   * When set to true, the response will include an extra _clusters object with information about
   * the clusters that participated in the search. Similar to `include_ccs_metadata`, but also
   * returns metadata when the query is not CCS/CPS.
   */
  includeExecutionMetadata?: boolean;

  /**
   * When set to true, requests the `column_metadata` setting from Elasticsearch, which is required
   * to receive the `_meta` field on columns in the response.
   */
  columnMetadata?: boolean;

  /**
   * When true, ES|QL queries use approximate execution for faster, estimated results.
   */
  approximation?: boolean;
}

/**
 * Options specific to ES|QL search. `params` shapes the query; `options` is Kibana plumbing
 * (session, inspector, abort, execution context, project routing).
 */
export type IEsqlSearchOptions = IBaseSearchOptions;

/**
 * Result from an ES|QL search
 */
export interface IEsqlSearchResult {
  /**
   * Raw Elasticsearch ES|QL async query response
   */
  rawResponse: estypes.EsqlAsyncQueryResponse;
  /**
   * Warning message from the ES Warning HTTP response header
   */
  warning?: string;
  /**
   * The response mapped to an expressions Datatable, ready for use in visualizations.
   */
  datatable?: Datatable;
}

// ============================================================================
// EQL Search Types
// ============================================================================

/**
 * Parameters for EQL (Event Query Language) search
 */
export interface IEqlSearchParams {
  /**
   * Index to search
   */
  index: string | AbstractDataView;

  /**
   * EQL query string
   */
  query: string;

  /**
   * Filter to apply before EQL processing
   */
  filter?: estypes.QueryDslQueryContainer | estypes.QueryDslQueryContainer[];

  /**
   * Maximum number of events to return
   */
  size?: number;

  /**
   * Fields to retrieve
   */
  fields?: estypes.Fields;

  /**
   * Runtime field mappings
   */
  runtimeMappings?: estypes.MappingRuntimeFields;
}

/**
 * Options specific to EQL search
 */
export interface IEqlSearchOptions extends IBaseSearchOptions {
  /**
   * Field containing the event category
   */
  eventCategoryField?: string;

  /**
   * Field containing the timestamp
   */
  timestampField?: string;

  /**
   * Field to use for tiebreaking
   */
  tiebreakerField?: string;
}

/**
 * Result from an EQL search
 */
export interface IEqlSearchResult {
  /**
   * Raw Elasticsearch EQL search response
   */
  rawResponse: estypes.EqlSearchResponse;
}

// ============================================================================
// SQL Search Types
// ============================================================================

/**
 * Parameters for SQL search
 */
export interface ISqlSearchParams {
  /**
   * SQL query string
   */
  query: string;

  /**
   * Query parameters for parameterized queries
   */
  params?: unknown[];

  /**
   * Number of rows to fetch per page
   */
  fetchSize?: number;

  /**
   * Additional filter to apply
   */
  filter?: estypes.QueryDslQueryContainer | estypes.QueryDslQueryContainer[];
}

/**
 * Options specific to SQL search
 */
export interface ISqlSearchOptions extends IBaseSearchOptions {
  /**
   * Time zone for date calculations
   */
  timeZone?: string;
}

/**
 * Result from a SQL search
 */
export interface ISqlSearchResult {
  /**
   * Raw Elasticsearch SQL query response
   */
  rawResponse: estypes.SqlQueryResponse;

  /**
   * Time in milliseconds the search took to execute
   */
  took: number;
}

// ============================================================================
// Search Methods Interface
// ============================================================================

/**
 * Search methods providing strategy-specific methods with type-safe
 * parameters and built-in pagination support.
 */
export interface ISearchMethods {
  /**
   * Execute an ES|QL search
   */
  esql: (params: IEsqlSearchParams, options?: IEsqlSearchOptions) => Promise<IEsqlSearchResult>;

  /**
   * Execute a DSL (Elasticsearch Query DSL) search
   */
  dsl: (params: IDslSearchParams, options?: IDslSearchOptions) => Promise<IDslSearchResult>;

  /**
   * Execute a paginated DSL (Elasticsearch Query DSL) search with pagination helpers
   */
  dslPaginated: (
    params: IDslPaginatedSearchParams,
    options?: IDslPaginatedSearchOptions
  ) => Promise<IDslPaginatedSearchResult>;

  /**
   * Execute an EQL (Event Query Language) search
   */
  eql: (params: IEqlSearchParams, options?: IEqlSearchOptions) => Promise<IEqlSearchResult>;

  /**
   * Execute a SQL search
   */
  sql: (params: ISqlSearchParams, options?: ISqlSearchOptions) => Promise<ISqlSearchResult>;
}
