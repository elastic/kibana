/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */
// @ts-nocheck

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

/**
 * We are still working on this type, it will arrive soon.
 * If it's critical for you, please open an issue.
 * https://github.com/elastic/elasticsearch-specification
 */
export const TODO = z.record(z.string(), z.any())
export type TODO = z.infer<typeof TODO>

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export const DurationValue = z.any().meta({ id: 'DurationValue' })
export type DurationValue = z.infer<typeof DurationValue>

export interface ErrorCauseShape {
  type: string
  reason?: string | null | undefined
  stack_trace?: string | undefined
  caused_by?: ErrorCauseShape | undefined
  root_cause?: ErrorCauseShape[] | undefined
  suppressed?: ErrorCauseShape[] | undefined
}
/**
 * Cause and details about a request failure. This class defines the properties common to all error types.
 * Additional details are also provided, that depend on the error type.
 */
export const ErrorCause = z.looseObject({
  type: z.string().describe('The type of error'),
  reason: z.union([z.string(), z.null()]).describe('A human-readable explanation of the error, in English.').optional(),
  stack_trace: z.string().describe('The server stack trace. Present only if the `error_trace=true` parameter was sent with the request.').optional(),
  get caused_by () { return ErrorCause.optional() },
  get root_cause () { return ErrorCause.array().optional() },
  get suppressed () { return ErrorCause.array().optional() }
}).meta({ id: 'ErrorCause' })
export type ErrorCause = z.infer<typeof ErrorCause>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const double = z.number().meta({ id: 'double' })
export type double = z.infer<typeof double>

/** A field value. */
export const FieldValue = z.union([long, double, z.string(), z.boolean(), z.null()]).meta({ id: 'FieldValue' })
export type FieldValue = z.infer<typeof FieldValue>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const NodeId = z.string().meta({ id: 'NodeId' })
export type NodeId = z.infer<typeof NodeId>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

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

export const EsqlEsqlFormat = z.enum(['csv', 'json', 'tsv', 'txt', 'yaml', 'cbor', 'smile', 'arrow']).meta({ id: 'EsqlEsqlFormat' })
export type EsqlEsqlFormat = z.infer<typeof EsqlEsqlFormat>

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
