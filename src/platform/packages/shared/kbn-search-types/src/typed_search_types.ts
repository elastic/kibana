/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { KibanaExecutionContext } from '@kbn/core/public';
import type { AbstractDataView } from '@kbn/data-views-plugin/common';
import type { ProjectRouting } from '@kbn/es-query';
import type { SanitizedConnectionRequestParams } from './types';

/**
 * Base options shared across all typed search methods
 */
export interface IBaseSearchOptions {
  /**
   * An `AbortSignal` that allows the caller to abort a search request.
   */
  abortSignal?: AbortSignal;

  /**
   * A session ID, grouping multiple search requests into a single session.
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
}

// ============================================================================
// DSL Search Types
// ============================================================================

/**
 * Parameters for DSL (Elasticsearch Query DSL) search
 */
export interface IDSLSearchParams {
  /**
   * Index pattern to search
   */
  index: string;

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
   * Allow any additional SearchRequest body properties for maximum compatibility
   */
  [key: string]: unknown;
}

/**
 * Options specific to DSL search
 */
export interface IDSLSearchOptions extends IBaseSearchOptions {
  /**
   * DataView for better error messages
   */
  dataView?: AbstractDataView;

  /**
   * Request the legacy format for the total number of hits
   */
  legacyHitsTotal?: boolean;

  /**
   * Control total hits counting precision
   */
  trackTotalHits?: boolean | number;

  /**
   * Enable pagination support using search_after
   */
  paginate?: boolean;
}

/**
 * Pagination helpers for DSL search results
 */
export interface IDSLPagination {
  /**
   * Whether more results are available
   */
  hasNextPage: boolean;

  /**
   * Fetch the next page of results using search_after
   */
  nextPage: () => Promise<IDSLSearchResult | null>;

  /**
   * Iterate through all pages (up to maxPages)
   */
  getAllPages: (maxPages?: number) => AsyncGenerator<IDSLSearchResult>;
}

/**
 * Result from a DSL search
 */
export interface IDSLSearchResult<TDoc = unknown> {
  /**
   * Raw Elasticsearch search response
   */
  rawResponse: estypes.SearchResponse<TDoc>;
  /**
   * Request parameters for inspector
   */
  requestParams?: SanitizedConnectionRequestParams;
  /**
   * Pagination helpers (only present when paginate: true option is used)
   */
  pagination?: IDSLPagination;
}

// ============================================================================
// Aggregation-Only Search Types
// ============================================================================

/**
 * Parameters for aggregation-only search (size: 0)
 */
export interface IAggsSearchParams {
  /**
   * Index pattern to search
   */
  index: string;

  /**
   * Query to filter documents before aggregating
   */
  query?: estypes.QueryDslQueryContainer;

  /**
   * Aggregations to compute (required)
   */
  aggs: Record<string, estypes.AggregationsAggregationContainer>;

  /**
   * Runtime field mappings
   */
  runtimeMappings?: estypes.MappingRuntimeFields;
}

/**
 * Options specific to aggregation search
 */
export interface IAggsSearchOptions extends IBaseSearchOptions {
  /**
   * DataView for better error messages
   */
  dataView?: AbstractDataView;
}

/**
 * Result from an aggregation-only search
 */
export interface IAggsSearchResult {
  /**
   * Raw Elasticsearch search response (size: 0, contains aggregations)
   */
  rawResponse: estypes.SearchResponse;
  /**
   * Request parameters for inspector
   */
  requestParams?: SanitizedConnectionRequestParams;
}

// ============================================================================
// ES|QL Search Types
// ============================================================================

/**
 * Parameters for ES|QL search
 */
export interface IESQLSearchParams {
  /**
   * ES|QL query string
   */
  query: string;

  /**
   * Query parameters for parameterized queries
   */
  params?: Array<{ name: string; value: unknown }>;

  /**
   * Additional filter to apply
   */
  filter?: estypes.QueryDslQueryContainer | estypes.QueryDslQueryContainer[];

  /**
   * Time zone for date calculations
   */
  timeZone?: string;

  /**
   * Locale for string operations
   */
  locale?: string;
}

/**
 * Options specific to ES|QL search
 */
export interface IESQLSearchOptions extends IBaseSearchOptions {
  /**
   * Drop columns that only contain null values
   */
  dropNullColumns?: boolean;

  /**
   * When set to true, the response will include an extra _clusters object with information about the clusters that participated in the search along with info such as shards count. This is similar to include_ccs_metadata, but it also returns metadata when the query is not CCS/CPS
   */
  includeExecutionMetadata?: boolean;
}

/**
 * Result from an ES|QL search
 */
export interface IESQLSearchResult {
  /**
   * Raw Elasticsearch ES|QL async query response
   */
  rawResponse: estypes.EsqlAsyncQueryResponse;
  /**
   * Request parameters for inspector
   */
  requestParams?: SanitizedConnectionRequestParams;
}

// ============================================================================
// EQL Search Types
// ============================================================================

/**
 * Parameters for EQL (Event Query Language) search
 */
export interface IEQLSearchParams {
  /**
   * Index to search
   */
  index: string;

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
export interface IEQLSearchOptions extends IBaseSearchOptions {
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
export interface IEQLSearchResult {
  /**
   * Raw Elasticsearch EQL search response
   */
  rawResponse: estypes.EqlSearchResponse;
  /**
   * Request parameters for inspector
   */
  requestParams?: SanitizedConnectionRequestParams;
}

// ============================================================================
// SQL Search Types
// ============================================================================

/**
 * Parameters for SQL search
 */
export interface ISQLSearchParams {
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
export interface ISQLSearchOptions extends IBaseSearchOptions {
  /**
   * Response format
   */
  format?: 'json' | 'csv' | 'txt' | 'tsv' | 'yaml';

  /**
   * Time zone for date calculations
   */
  timeZone?: string;
}

/**
 * Result from a SQL search
 */
export interface ISQLSearchResult {
  /**
   * Raw Elasticsearch SQL query response
   */
  rawResponse: estypes.SqlQueryResponse;

  /**
   * Time in milliseconds the search took to execute
   */
  took: number;

  /**
   * Request parameters for inspector
   */
  requestParams?: SanitizedConnectionRequestParams;
}

// ============================================================================
// Typed Search Service Interface
// ============================================================================

/**
 * Typed search service providing strategy-specific methods with type-safe
 * parameters and built-in pagination support.
 */
export interface ITypedSearchService {
  /**
   * Execute an ES|QL search
   */
  searchESQL: (
    params: IESQLSearchParams,
    options?: IESQLSearchOptions
  ) => Promise<IESQLSearchResult>;

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

  /**
   * Execute an EQL (Event Query Language) search
   */
  searchEQL: (params: IEQLSearchParams, options?: IEQLSearchOptions) => Promise<IEQLSearchResult>;

  /**
   * Execute a SQL search
   */
  searchSQL: (params: ISQLSearchParams, options?: ISQLSearchOptions) => Promise<ISQLSearchResult>;
}
