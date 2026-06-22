/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { SearchSourceConfig, SearchTrackHits } from './_global.search'
import { AcknowledgedResponseBase, Duration, EpochTime, Id, Name, RequestBase, TimeZone, integer, long, uint } from './_types'
import { AggregationsAggregationContainer } from './_types.aggregations'
import { MappingRuntimeFields } from './_types.mapping'
import { QueryDslFieldAndFormat, QueryDslQueryContainer, Sort } from './_types.query_dsl'

export const SqlColumn = z.object({
  name: Name,
  type: z.string()
}).meta({ id: 'SqlColumn' })
export type SqlColumn = z.infer<typeof SqlColumn>

export const SqlRow = z.array(z.any()).meta({ id: 'SqlRow' })
export type SqlRow = z.infer<typeof SqlRow>

/** Clear an SQL search cursor. */
export const SqlClearCursorRequest = z.object({
  ...RequestBase.shape,
  cursor: z.string().describe('Cursor to clear.').meta({ found_in: 'body' })
}).meta({ id: 'SqlClearCursorRequest' })
export type SqlClearCursorRequest = z.infer<typeof SqlClearCursorRequest>

export const SqlClearCursorResponse = z.object({
  succeeded: z.boolean()
}).meta({ id: 'SqlClearCursorResponse' })
export type SqlClearCursorResponse = z.infer<typeof SqlClearCursorResponse>

/**
 * Delete an async SQL search.
 *
 * Delete an async SQL search or a stored synchronous SQL search.
 * If the search is still running, the API cancels it.
 *
 * If the Elasticsearch security features are enabled, only the following users can use this API to delete a search:
 *
 * * Users with the `cancel_task` cluster privilege.
 * * The user who first submitted the search.
 */
export const SqlDeleteAsyncRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('The identifier for the search.').meta({ found_in: 'path' })
}).meta({ id: 'SqlDeleteAsyncRequest' })
export type SqlDeleteAsyncRequest = z.infer<typeof SqlDeleteAsyncRequest>

export const SqlDeleteAsyncResponse = AcknowledgedResponseBase.meta({ id: 'SqlDeleteAsyncResponse' })
export type SqlDeleteAsyncResponse = z.infer<typeof SqlDeleteAsyncResponse>

/**
 * Get async SQL search results.
 *
 * Get the current status and available results for an async SQL search or stored synchronous SQL search.
 *
 * If the Elasticsearch security features are enabled, only the user who first submitted the SQL search can retrieve the search using this API.
 */
export const SqlGetAsyncRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('The identifier for the search.').meta({ found_in: 'path' }),
  delimiter: z.string().describe('The separator for CSV results. The API supports this parameter only for CSV responses.').optional().meta({ found_in: 'query' }),
  format: z.string().describe('The format for the response. You must specify a format using this parameter or the `Accept` HTTP header. If you specify both, the API uses this parameter.').optional().meta({ found_in: 'query' }),
  keep_alive: Duration.describe('The retention period for the search and its results. It defaults to the `keep_alive` period for the original SQL search.').optional().meta({ found_in: 'query' }),
  wait_for_completion_timeout: Duration.describe('The period to wait for complete results. It defaults to no timeout, meaning the request waits for complete search results.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SqlGetAsyncRequest' })
export type SqlGetAsyncRequest = z.infer<typeof SqlGetAsyncRequest>

export const SqlGetAsyncResponse = z.object({
  id: Id.describe('Identifier for the search. This value is returned only for async and saved synchronous searches. For CSV, TSV, and TXT responses, this value is returned in the `Async-ID` HTTP header.'),
  is_running: z.boolean().describe('If `true`, the search is still running. If `false`, the search has finished. This value is returned only for async and saved synchronous searches. For CSV, TSV, and TXT responses, this value is returned in the `Async-partial` HTTP header.'),
  is_partial: z.boolean().describe('If `true`, the response does not contain complete search results. If `is_partial` is `true` and `is_running` is `true`, the search is still running. If `is_partial` is `true` but `is_running` is `false`, the results are partial due to a failure or timeout. This value is returned only for async and saved synchronous searches. For CSV, TSV, and TXT responses, this value is returned in the `Async-partial` HTTP header.'),
  columns: z.array(SqlColumn).describe('Column headings for the search results. Each object is a column.').optional(),
  cursor: z.string().describe('The cursor for the next set of paginated results. For CSV, TSV, and TXT responses, this value is returned in the `Cursor` HTTP header.').optional(),
  rows: z.array(SqlRow).describe('The values for the search results.')
}).meta({ id: 'SqlGetAsyncResponse' })
export type SqlGetAsyncResponse = z.infer<typeof SqlGetAsyncResponse>

/**
 * Get the async SQL search status.
 *
 * Get the current status of an async SQL search or a stored synchronous SQL search.
 */
export const SqlGetAsyncStatusRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('The identifier for the search.').meta({ found_in: 'path' })
}).meta({ id: 'SqlGetAsyncStatusRequest' })
export type SqlGetAsyncStatusRequest = z.infer<typeof SqlGetAsyncStatusRequest>

export const SqlGetAsyncStatusResponse = z.object({
  expiration_time_in_millis: EpochTime.describe('The timestamp, in milliseconds since the Unix epoch, when Elasticsearch will delete the search and its results, even if the search is still running.'),
  id: z.string().describe('The identifier for the search.'),
  is_running: z.boolean().describe('If `true`, the search is still running. If `false`, the search has finished.'),
  is_partial: z.boolean().describe('If `true`, the response does not contain complete search results. If `is_partial` is `true` and `is_running` is `true`, the search is still running. If `is_partial` is `true` but `is_running` is `false`, the results are partial due to a failure or timeout.'),
  start_time_in_millis: EpochTime.describe('The timestamp, in milliseconds since the Unix epoch, when the search started. The API returns this property only for running searches.'),
  completion_status: uint.describe('The HTTP status code for the search. The API returns this property only for completed searches.').optional()
}).meta({ id: 'SqlGetAsyncStatusResponse' })
export type SqlGetAsyncStatusResponse = z.infer<typeof SqlGetAsyncStatusResponse>

export const SqlQuerySqlFormat = z.enum(['csv', 'json', 'tsv', 'txt', 'yaml', 'cbor', 'smile']).meta({ id: 'SqlQuerySqlFormat' })
export type SqlQuerySqlFormat = z.infer<typeof SqlQuerySqlFormat>

/**
 * Get SQL search results.
 *
 * Run an SQL request.
 */
export const SqlQueryRequest = z.object({
  ...RequestBase.shape,
  format: SqlQuerySqlFormat.describe('The format for the response. You can also specify a format using the `Accept` HTTP header. If you specify both this parameter and the `Accept` HTTP header, this parameter takes precedence.').optional().meta({ found_in: 'query' }),
  allow_partial_search_results: z.boolean().describe('If `true`, the response has partial results when there are shard request timeouts or shard failures. If `false`, the API returns an error with no partial results.').optional().meta({ found_in: 'body' }),
  catalog: z.string().describe('The default catalog (cluster) for queries. If unspecified, the queries execute on the data in the local cluster only.').optional().meta({ found_in: 'body' }),
  columnar: z.boolean().describe('If `true`, the results are in a columnar fashion: one row represents all the values of a certain column from the current page of results. The API supports this parameter only for CBOR, JSON, SMILE, and YAML responses.').optional().meta({ found_in: 'body' }),
  cursor: z.string().describe('The cursor used to retrieve a set of paginated results. If you specify a cursor, the API only uses the `columnar` and `time_zone` request body parameters. It ignores other request body parameters.').optional().meta({ found_in: 'body' }),
  fetch_size: integer.describe('The maximum number of rows (or entries) to return in one response.').optional().meta({ found_in: 'body' }),
  field_multi_value_leniency: z.boolean().describe('If `false`, the API returns an exception when encountering multiple values for a field. If `true`, the API is lenient and returns the first value from the array with no guarantee of consistent results.').optional().meta({ found_in: 'body' }),
  filter: z.lazy(() => QueryDslQueryContainer).describe('The Elasticsearch query DSL for additional filtering.').optional().meta({ found_in: 'body' }),
  index_using_frozen: z.boolean().describe('If `true`, the search can run on frozen indices.').optional().meta({ found_in: 'body' }),
  keep_alive: Duration.describe('The retention period for an async or saved synchronous search.').optional().meta({ found_in: 'body' }),
  keep_on_completion: z.boolean().describe('If `true`, Elasticsearch stores synchronous searches if you also specify the `wait_for_completion_timeout` parameter. If `false`, Elasticsearch only stores async searches that don\'t finish before the `wait_for_completion_timeout`.').optional().meta({ found_in: 'body' }),
  page_timeout: Duration.describe('The minimum retention period for the scroll cursor. After this time period, a pagination request might fail because the scroll cursor is no longer available. Subsequent scroll requests prolong the lifetime of the scroll cursor by the duration of `page_timeout` in the scroll request.').optional().meta({ found_in: 'body' }),
  params: z.array(z.any()).describe('The values for parameters in the query.').optional().meta({ found_in: 'body' }),
  query: z.string().describe('The SQL query to run.').optional().meta({ found_in: 'body' }),
  request_timeout: Duration.describe('The timeout before the request fails.').optional().meta({ found_in: 'body' }),
  runtime_mappings: z.lazy(() => MappingRuntimeFields).describe('One or more runtime fields for the search request. These fields take precedence over mapped fields with the same name.').optional().meta({ found_in: 'body' }),
  time_zone: TimeZone.describe('The ISO-8601 time zone ID for the search.').optional().meta({ found_in: 'body' }),
  wait_for_completion_timeout: Duration.describe('The period to wait for complete results. It defaults to no timeout, meaning the request waits for complete search results. If the search doesn\'t finish within this period, the search becomes async. To save a synchronous search, you must specify this parameter and the `keep_on_completion` parameter.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SqlQueryRequest' })
export type SqlQueryRequest = z.infer<typeof SqlQueryRequest>

export const SqlQueryResponse = z.object({
  columns: z.array(SqlColumn).describe('Column headings for the search results. Each object is a column.').optional(),
  cursor: z.string().describe('The cursor for the next set of paginated results. For CSV, TSV, and TXT responses, this value is returned in the `Cursor` HTTP header.').optional(),
  id: Id.describe('The identifier for the search. This value is returned only for async and saved synchronous searches. For CSV, TSV, and TXT responses, this value is returned in the `Async-ID` HTTP header.').optional(),
  is_running: z.boolean().describe('If `true`, the search is still running. If `false`, the search has finished. This value is returned only for async and saved synchronous searches. For CSV, TSV, and TXT responses, this value is returned in the `Async-partial` HTTP header.').optional(),
  is_partial: z.boolean().describe('If `true`, the response does not contain complete search results. If `is_partial` is `true` and `is_running` is `true`, the search is still running. If `is_partial` is `true` but `is_running` is `false`, the results are partial due to a failure or timeout. This value is returned only for async and saved synchronous searches. For CSV, TSV, and TXT responses, this value is returned in the `Async-partial` HTTP header.').optional(),
  rows: z.array(SqlRow).describe('The values for the search results.')
}).meta({ id: 'SqlQueryResponse' })
export type SqlQueryResponse = z.infer<typeof SqlQueryResponse>

/**
 * Translate SQL into Elasticsearch queries.
 *
 * Translate an SQL search into a search API request containing Query DSL.
 * It accepts the same request body parameters as the SQL search API, excluding `cursor`.
 */
export const SqlTranslateRequest = z.object({
  ...RequestBase.shape,
  fetch_size: integer.describe('The maximum number of rows (or entries) to return in one response.').optional().meta({ found_in: 'body' }),
  filter: z.lazy(() => QueryDslQueryContainer).describe('The Elasticsearch query DSL for additional filtering.').optional().meta({ found_in: 'body' }),
  query: z.string().describe('The SQL query to run.').meta({ found_in: 'body' }),
  time_zone: TimeZone.describe('The ISO-8601 time zone ID for the search.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SqlTranslateRequest' })
export type SqlTranslateRequest = z.infer<typeof SqlTranslateRequest>

export const SqlTranslateResponse = z.object({
  aggregations: z.record(z.string(), z.lazy(() => AggregationsAggregationContainer)).optional(),
  size: long.optional(),
  _source: z.lazy(() => SearchSourceConfig).optional(),
  fields: z.array(z.lazy(() => QueryDslFieldAndFormat)).optional(),
  query: z.lazy(() => QueryDslQueryContainer).optional(),
  sort: z.lazy(() => Sort).optional(),
  track_total_hits: SearchTrackHits.optional()
}).meta({ id: 'SqlTranslateResponse' })
export type SqlTranslateResponse = z.infer<typeof SqlTranslateResponse>
