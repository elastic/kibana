/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { AcknowledgedResponseBase, Duration, DurationValue, ErrorCause, FieldValue, Id, IndexName, NodeId, RequestBase, TaskId, double, integer, long } from './_types'
import { QueryDslQueryContainer } from './_types.query_dsl'

export const EsqlEsqlColumnInfo = z.object({
  name: z.string(),
  type: z.string()
}).meta({ id: 'EsqlEsqlColumnInfo' })
export type EsqlEsqlColumnInfo = z.infer<typeof EsqlEsqlColumnInfo>

export const EsqlEsqlClusterStatus = z.enum(['running', 'successful', 'partial', 'skipped', 'failed']).meta({ id: 'EsqlEsqlClusterStatus' })
export type EsqlEsqlClusterStatus = z.infer<typeof EsqlEsqlClusterStatus>

export const EsqlEsqlShardInfo = z.object({
  total: integer,
  successful: integer.optional(),
  skipped: integer.optional(),
  failed: integer.optional()
}).meta({ id: 'EsqlEsqlShardInfo' })
export type EsqlEsqlShardInfo = z.infer<typeof EsqlEsqlShardInfo>

export const EsqlEsqlShardFailure = z.object({
  shard: integer,
  index: z.union([IndexName, z.null()]),
  node: NodeId.optional(),
  reason: z.lazy(() => ErrorCause)
}).meta({ id: 'EsqlEsqlShardFailure' })
export type EsqlEsqlShardFailure = z.infer<typeof EsqlEsqlShardFailure>

export const EsqlEsqlClusterDetails = z.object({
  status: EsqlEsqlClusterStatus,
  indices: z.string(),
  took: DurationValue.optional(),
  _shards: EsqlEsqlShardInfo.optional(),
  failures: z.array(EsqlEsqlShardFailure).optional()
}).meta({ id: 'EsqlEsqlClusterDetails' })
export type EsqlEsqlClusterDetails = z.infer<typeof EsqlEsqlClusterDetails>

export const EsqlEsqlClusterInfo = z.object({
  total: integer,
  successful: integer,
  running: integer,
  skipped: integer,
  partial: integer,
  failed: integer,
  details: z.record(z.string(), EsqlEsqlClusterDetails)
}).meta({ id: 'EsqlEsqlClusterInfo' })
export type EsqlEsqlClusterInfo = z.infer<typeof EsqlEsqlClusterInfo>

export const EsqlEsqlResult = z.object({
  took: DurationValue.optional(),
  is_partial: z.boolean().optional(),
  all_columns: z.array(EsqlEsqlColumnInfo).optional(),
  columns: z.array(EsqlEsqlColumnInfo),
  values: z.array(z.array(FieldValue)),
  _clusters: EsqlEsqlClusterInfo.describe('Cross-cluster search information. Present if `include_ccs_metadata` was `true` in the request and a cross-cluster search was performed.').optional(),
  profile: z.any().describe('Profiling information. Present if `profile` was `true` in the request. The contents of this field are currently unstable.').optional()
}).meta({ id: 'EsqlEsqlResult' })
export type EsqlEsqlResult = z.infer<typeof EsqlEsqlResult>

export const EsqlAsyncEsqlResult = z.object({
  ...EsqlEsqlResult.shape,
  id: z.string().describe('The ID of the async query, to be used in subsequent requests to check the status or retrieve results. Also available in the `X-Elasticsearch-Async-Id` HTTP header.').optional(),
  is_running: z.boolean().describe('Indicates whether the async query is still running or has completed. Also available in the `X-Elasticsearch-Async-Is-Running` HTTP header.')
}).meta({ id: 'EsqlAsyncEsqlResult' })
export type EsqlAsyncEsqlResult = z.infer<typeof EsqlAsyncEsqlResult>

export const EsqlSingleOrMultiValue = z.union([FieldValue, z.array(FieldValue)]).meta({ id: 'EsqlSingleOrMultiValue' })
export type EsqlSingleOrMultiValue = z.infer<typeof EsqlSingleOrMultiValue>

export const EsqlNamedValue = z.record(z.string(), EsqlSingleOrMultiValue).meta({ id: 'EsqlNamedValue' })
export type EsqlNamedValue = z.infer<typeof EsqlNamedValue>

export const EsqlESQLParams = z.union([z.array(EsqlSingleOrMultiValue), z.array(EsqlNamedValue)]).meta({ id: 'EsqlESQLParams' })
export type EsqlESQLParams = z.infer<typeof EsqlESQLParams>

/** A non-materialized ES|QL view. */
export const EsqlESQLView = z.object({
  name: z.string().describe('The name of the ES|QL view'),
  query: z.string().describe('The ES|QL query')
}).meta({ id: 'EsqlESQLView' })
export type EsqlESQLView = z.infer<typeof EsqlESQLView>

export const EsqlEsqlFormat = z.enum(['csv', 'json', 'tsv', 'txt', 'yaml', 'cbor', 'smile', 'arrow']).meta({ id: 'EsqlEsqlFormat' })
export type EsqlEsqlFormat = z.infer<typeof EsqlEsqlFormat>

export const EsqlTableValuesIntegerValue = z.union([integer, z.array(integer)]).meta({ id: 'EsqlTableValuesIntegerValue' })
export type EsqlTableValuesIntegerValue = z.infer<typeof EsqlTableValuesIntegerValue>

export const EsqlTableValuesKeywordValue = z.union([z.string(), z.array(z.string())]).meta({ id: 'EsqlTableValuesKeywordValue' })
export type EsqlTableValuesKeywordValue = z.infer<typeof EsqlTableValuesKeywordValue>

export const EsqlTableValuesLongValue = z.union([long, z.array(long)]).meta({ id: 'EsqlTableValuesLongValue' })
export type EsqlTableValuesLongValue = z.infer<typeof EsqlTableValuesLongValue>

export const EsqlTableValuesLongDouble = z.union([double, z.array(double)]).meta({ id: 'EsqlTableValuesLongDouble' })
export type EsqlTableValuesLongDouble = z.infer<typeof EsqlTableValuesLongDouble>

const EsqlTableValuesContainerExclusiveProps = z.union([z.object({ integer: z.array(EsqlTableValuesIntegerValue) }), z.object({ keyword: z.array(EsqlTableValuesKeywordValue) }), z.object({ long: z.array(EsqlTableValuesLongValue) }), z.object({ double: z.array(EsqlTableValuesLongDouble) })])

export const EsqlTableValuesContainer = EsqlTableValuesContainerExclusiveProps.meta({ id: 'EsqlTableValuesContainer' })
export type EsqlTableValuesContainer = z.infer<typeof EsqlTableValuesContainer>

/**
 * Run an async ES|QL query.
 *
 * Asynchronously run an ES|QL (Elasticsearch query language) query, monitor its progress, and retrieve results when they become available.
 *
 * The API accepts the same parameters and request body as the synchronous query API, along with additional async related properties.
 */
export const EsqlAsyncQueryRequest = z.object({
  ...RequestBase.shape,
  allow_partial_results: z.boolean().describe('If `true`, partial results will be returned if there are shard failures, but the query can continue to execute on other clusters and shards. If `false`, the query will fail if there are any failures. To override the default behavior, you can set the `esql.query.allow_partial_results` cluster setting to `false`.').optional().meta({ found_in: 'query' }),
  delimiter: z.string().describe('The character to use between values within a CSV row. It is valid only for the CSV format.').optional().meta({ found_in: 'query' }),
  drop_null_columns: z.boolean().describe('Indicates whether columns that are entirely `null` will be removed from the `columns` and `values` portion of the results. If `true`, the response will include an extra section under the name `all_columns` which has the name of all the columns.').optional().meta({ found_in: 'query' }),
  format: EsqlEsqlFormat.describe('A short version of the Accept header, e.g. json, yaml. `csv`, `tsv`, and `txt` formats will return results in a tabular format, excluding other metadata fields from the response. For async requests, nothing will be returned if the async query doesn\'t finish within the timeout. The query ID and running status are available in the `X-Elasticsearch-Async-Id` and `X-Elasticsearch-Async-Is-Running` HTTP headers of the response, respectively.').optional().meta({ found_in: 'query' }),
  columnar: z.boolean().describe('By default, ES|QL returns results as rows. For example, FROM returns each individual document as one row. For the JSON, YAML, CBOR and smile formats, ES|QL can return the results in a columnar fashion where one row represents all the values of a certain column in the results.').optional().meta({ found_in: 'body' }),
  filter: z.lazy(() => QueryDslQueryContainer).describe('Specify a Query DSL query in the filter parameter to filter the set of documents that an ES|QL query runs on.').optional().meta({ found_in: 'body' }),
  time_zone: z.string().describe('Sets the default timezone of the query.').optional().meta({ found_in: 'body' }),
  locale: z.string().describe('Returns results (especially dates) formatted per the conventions of the locale.').optional().meta({ found_in: 'body' }),
  params: EsqlESQLParams.describe('To avoid any attempts of hacking or code injection, extract the values in a separate list of parameters. Use question mark placeholders (?) in the query string for each of the parameters.').optional().meta({ found_in: 'body' }),
  profile: z.boolean().describe('If provided and `true` the response will include an extra `profile` object with information on how the query was executed. This information is for human debugging and its format can change at any time but it can give some insight into the performance of each part of the query.').optional().meta({ found_in: 'body' }),
  query: z.string().describe('The ES|QL query API accepts an ES|QL query string in the query parameter, runs it, and returns the results.').meta({ found_in: 'body' }),
  tables: z.record(z.string(), z.record(z.string(), EsqlTableValuesContainer)).describe('Tables to use with the LOOKUP operation. The top level key is the table name and the next level key is the column name.').optional().meta({ found_in: 'body' }),
  include_ccs_metadata: z.boolean().describe('When set to `true` and performing a cross-cluster/cross-project query, the response will include an extra `_clusters` object with information about the clusters that participated in the search along with info such as shards count.').optional().meta({ found_in: 'body' }),
  include_execution_metadata: z.boolean().describe('When set to `true`, the response will include an extra `_clusters` object with information about the clusters that participated in the search along with info such as shards count. This is similar to `include_ccs_metadata`, but it also returns metadata when the query is not CCS/CPS').optional().meta({ found_in: 'body' }),
  wait_for_completion_timeout: Duration.describe('The period to wait for the request to finish. By default, the request waits for 1 second for the query results. If the query completes during this period, results are returned Otherwise, a query ID is returned that can later be used to retrieve the results.').optional().meta({ found_in: 'body' }),
  keep_alive: Duration.describe('The period for which the query and its results are stored in the cluster. The default period is five days. When this period expires, the query and its results are deleted, even if the query is still ongoing. If the `keep_on_completion` parameter is false, Elasticsearch only stores async queries that do not complete within the period set by the `wait_for_completion_timeout` parameter, regardless of this value.').optional().meta({ found_in: 'body' }),
  keep_on_completion: z.boolean().describe('Indicates whether the query and its results are stored in the cluster. If false, the query and its results are stored in the cluster only if the request does not complete during the period set by the `wait_for_completion_timeout` parameter.').optional().meta({ found_in: 'body' })
}).meta({ id: 'EsqlAsyncQueryRequest' })
export type EsqlAsyncQueryRequest = z.infer<typeof EsqlAsyncQueryRequest>

export const EsqlAsyncQueryResponse = EsqlAsyncEsqlResult.meta({ id: 'EsqlAsyncQueryResponse' })
export type EsqlAsyncQueryResponse = z.infer<typeof EsqlAsyncQueryResponse>

/**
 * Delete an async ES|QL query.
 *
 * If the query is still running, it is cancelled.
 * Otherwise, the stored results are deleted.
 *
 * If the Elasticsearch security features are enabled, only the following users can use this API to delete a query:
 *
 * * The authenticated user that submitted the original query request
 * * Users with the `cancel_task` cluster privilege
 */
export const EsqlAsyncQueryDeleteRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('The unique identifier of the query. A query ID is provided in the ES|QL async query API response for a query that does not complete in the designated time. A query ID is also provided when the request was submitted with the `keep_on_completion` parameter set to `true`.').meta({ found_in: 'path' })
}).meta({ id: 'EsqlAsyncQueryDeleteRequest' })
export type EsqlAsyncQueryDeleteRequest = z.infer<typeof EsqlAsyncQueryDeleteRequest>

export const EsqlAsyncQueryDeleteResponse = AcknowledgedResponseBase.meta({ id: 'EsqlAsyncQueryDeleteResponse' })
export type EsqlAsyncQueryDeleteResponse = z.infer<typeof EsqlAsyncQueryDeleteResponse>

/**
 * Get async ES|QL query results.
 *
 * Get the current status and available results or stored results for an ES|QL asynchronous query.
 * If the Elasticsearch security features are enabled, only the user who first submitted the ES|QL query can retrieve the results using this API.
 */
export const EsqlAsyncQueryGetRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('The unique identifier of the query. A query ID is provided in the ES|QL async query API response for a query that does not complete in the designated time. A query ID is also provided when the request was submitted with the `keep_on_completion` parameter set to `true`.').meta({ found_in: 'path' }),
  drop_null_columns: z.boolean().describe('Indicates whether columns that are entirely `null` will be removed from the `columns` and `values` portion of the results. If `true`, the response will include an extra section under the name `all_columns` which has the name of all the columns.').optional().meta({ found_in: 'query' }),
  format: EsqlEsqlFormat.describe('A short version of the Accept header, for example `json` or `yaml`.').optional().meta({ found_in: 'query' }),
  keep_alive: Duration.describe('The period for which the query and its results are stored in the cluster. When this period expires, the query and its results are deleted, even if the query is still ongoing.').optional().meta({ found_in: 'query' }),
  wait_for_completion_timeout: Duration.describe('The period to wait for the request to finish. By default, the request waits for complete query results. If the request completes during the period specified in this parameter, complete query results are returned. Otherwise, the response returns an `is_running` value of `true` and no results.').optional().meta({ found_in: 'query' })
}).meta({ id: 'EsqlAsyncQueryGetRequest' })
export type EsqlAsyncQueryGetRequest = z.infer<typeof EsqlAsyncQueryGetRequest>

export const EsqlAsyncQueryGetResponse = EsqlAsyncEsqlResult.meta({ id: 'EsqlAsyncQueryGetResponse' })
export type EsqlAsyncQueryGetResponse = z.infer<typeof EsqlAsyncQueryGetResponse>

/**
 * Stop async ES|QL query.
 *
 * This API interrupts the query execution and returns the results so far.
 * If the Elasticsearch security features are enabled, only the user who first submitted the ES|QL query can stop it.
 */
export const EsqlAsyncQueryStopRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('The unique identifier of the query. A query ID is provided in the ES|QL async query API response for a query that does not complete in the designated time. A query ID is also provided when the request was submitted with the `keep_on_completion` parameter set to `true`.').meta({ found_in: 'path' }),
  drop_null_columns: z.boolean().describe('Indicates whether columns that are entirely `null` will be removed from the `columns` and `values` portion of the results. If `true`, the response will include an extra section under the name `all_columns` which has the name of all the columns.').optional().meta({ found_in: 'query' })
}).meta({ id: 'EsqlAsyncQueryStopRequest' })
export type EsqlAsyncQueryStopRequest = z.infer<typeof EsqlAsyncQueryStopRequest>

export const EsqlAsyncQueryStopResponse = EsqlEsqlResult.meta({ id: 'EsqlAsyncQueryStopResponse' })
export type EsqlAsyncQueryStopResponse = z.infer<typeof EsqlAsyncQueryStopResponse>

/**
 * Delete an ES|QL view.
 *
 * Deletes a stored ES|QL view.
 */
export const EsqlDeleteViewRequest = z.object({
  ...RequestBase.shape,
  name: Id.describe('The view name to remove.').meta({ found_in: 'path' })
}).meta({ id: 'EsqlDeleteViewRequest' })
export type EsqlDeleteViewRequest = z.infer<typeof EsqlDeleteViewRequest>

export const EsqlDeleteViewResponse = AcknowledgedResponseBase.meta({ id: 'EsqlDeleteViewResponse' })
export type EsqlDeleteViewResponse = z.infer<typeof EsqlDeleteViewResponse>

/**
 * Get a specific running ES|QL query information.
 *
 * Returns an object extended information about a running ES|QL query.
 */
export const EsqlGetQueryRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('The query ID').meta({ found_in: 'path' })
}).meta({ id: 'EsqlGetQueryRequest' })
export type EsqlGetQueryRequest = z.infer<typeof EsqlGetQueryRequest>

export const EsqlGetQueryResponse = z.object({
  id: long,
  node: NodeId,
  start_time_millis: long,
  running_time_nanos: long,
  query: z.string(),
  coordinating_node: NodeId,
  data_nodes: z.array(NodeId)
}).meta({ id: 'EsqlGetQueryResponse' })
export type EsqlGetQueryResponse = z.infer<typeof EsqlGetQueryResponse>

/**
 * Get an ES|QL view.
 *
 * Returns a stored ES|QL view.
 */
export const EsqlGetViewRequest = z.object({
  ...RequestBase.shape,
  name: Id.describe('The comma-separated view names to retrieve.').optional().meta({ found_in: 'path' })
}).meta({ id: 'EsqlGetViewRequest' })
export type EsqlGetViewRequest = z.infer<typeof EsqlGetViewRequest>

export const EsqlGetViewResponse = z.object({
  views: z.array(EsqlESQLView)
}).meta({ id: 'EsqlGetViewResponse' })
export type EsqlGetViewResponse = z.infer<typeof EsqlGetViewResponse>

export const EsqlListQueriesBody = z.object({
  id: long,
  node: NodeId,
  start_time_millis: long,
  running_time_nanos: long,
  query: z.string()
}).meta({ id: 'EsqlListQueriesBody' })
export type EsqlListQueriesBody = z.infer<typeof EsqlListQueriesBody>

/**
 * Get running ES|QL queries information.
 *
 * Returns an object containing IDs and other information about the running ES|QL queries.
 */
export const EsqlListQueriesRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'EsqlListQueriesRequest' })
export type EsqlListQueriesRequest = z.infer<typeof EsqlListQueriesRequest>

export const EsqlListQueriesResponse = z.object({
  queries: z.record(TaskId, EsqlListQueriesBody)
}).meta({ id: 'EsqlListQueriesResponse' })
export type EsqlListQueriesResponse = z.infer<typeof EsqlListQueriesResponse>

/** Create or update an ES|QL view. */
export const EsqlPutViewRequest = z.object({
  ...RequestBase.shape,
  name: Id.describe('The view name to create or update.').meta({ found_in: 'path' }),
  query: z.string().describe('The ES|QL query string from which to create a view.').meta({ found_in: 'body' })
}).meta({ id: 'EsqlPutViewRequest' })
export type EsqlPutViewRequest = z.infer<typeof EsqlPutViewRequest>

export const EsqlPutViewResponse = AcknowledgedResponseBase.meta({ id: 'EsqlPutViewResponse' })
export type EsqlPutViewResponse = z.infer<typeof EsqlPutViewResponse>

/**
 * Run an ES|QL query.
 *
 * Get search results for an ES|QL (Elasticsearch query language) query.
 */
export const EsqlQueryRequest = z.object({
  ...RequestBase.shape,
  format: EsqlEsqlFormat.describe('A short version of the Accept header, e.g. json, yaml. `csv`, `tsv`, and `txt` formats will return results in a tabular format, excluding other metadata fields from the response.').optional().meta({ found_in: 'query' }),
  delimiter: z.string().describe('The character to use between values within a CSV row. Only valid for the CSV format.').optional().meta({ found_in: 'query' }),
  drop_null_columns: z.boolean().describe('Should columns that are entirely `null` be removed from the `columns` and `values` portion of the results? Defaults to `false`. If `true` then the response will include an extra section under the name `all_columns` which has the name of all columns.').optional().meta({ found_in: 'query' }),
  allow_partial_results: z.boolean().describe('If `true`, partial results will be returned if there are shard failures, but the query can continue to execute on other clusters and shards. If `false`, the query will fail if there are any failures. To override the default behavior, you can set the `esql.query.allow_partial_results` cluster setting to `false`.').optional().meta({ found_in: 'query' }),
  columnar: z.boolean().describe('By default, ES|QL returns results as rows. For example, FROM returns each individual document as one row. For the JSON, YAML, CBOR and smile formats, ES|QL can return the results in a columnar fashion where one row represents all the values of a certain column in the results.').optional().meta({ found_in: 'body' }),
  filter: z.lazy(() => QueryDslQueryContainer).describe('Specify a Query DSL query in the filter parameter to filter the set of documents that an ES|QL query runs on.').optional().meta({ found_in: 'body' }),
  time_zone: z.string().describe('Sets the default timezone of the query.').optional().meta({ found_in: 'body' }),
  locale: z.string().describe('Returns results (especially dates) formatted per the conventions of the locale.').optional().meta({ found_in: 'body' }),
  params: EsqlESQLParams.describe('To avoid any attempts of hacking or code injection, extract the values in a separate list of parameters. Use question mark placeholders (?) in the query string for each of the parameters.').optional().meta({ found_in: 'body' }),
  profile: z.boolean().describe('If provided and `true` the response will include an extra `profile` object with information on how the query was executed. This information is for human debugging and its format can change at any time but it can give some insight into the performance of each part of the query.').optional().meta({ found_in: 'body' }),
  query: z.string().describe('The ES|QL query API accepts an ES|QL query string in the query parameter, runs it, and returns the results.').meta({ found_in: 'body' }),
  tables: z.record(z.string(), z.record(z.string(), EsqlTableValuesContainer)).describe('Tables to use with the LOOKUP operation. The top level key is the table name and the next level key is the column name.').optional().meta({ found_in: 'body' }),
  include_ccs_metadata: z.boolean().describe('When set to `true` and performing a cross-cluster/cross-project query, the response will include an extra `_clusters` object with information about the clusters that participated in the search along with info such as shards count.').optional().meta({ found_in: 'body' }),
  include_execution_metadata: z.boolean().describe('When set to `true`, the response will include an extra `_clusters` object with information about the clusters that participated in the search along with info such as shards count. This is similar to `include_ccs_metadata`, but it also returns metadata when the query is not CCS/CPS').optional().meta({ found_in: 'body' })
}).meta({ id: 'EsqlQueryRequest' })
export type EsqlQueryRequest = z.infer<typeof EsqlQueryRequest>

export const EsqlQueryResponse = EsqlEsqlResult.meta({ id: 'EsqlQueryResponse' })
export type EsqlQueryResponse = z.infer<typeof EsqlQueryResponse>
