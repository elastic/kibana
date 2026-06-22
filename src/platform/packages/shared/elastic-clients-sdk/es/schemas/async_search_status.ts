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

export const ClusterAlias = z.string().meta({ id: 'ClusterAlias' })
export type ClusterAlias = z.infer<typeof ClusterAlias>

export const ClusterSearchStatus = z.enum(['running', 'successful', 'partial', 'skipped', 'failed']).meta({ id: 'ClusterSearchStatus' })
export type ClusterSearchStatus = z.infer<typeof ClusterSearchStatus>

export const DurationValue = z.any().meta({ id: 'DurationValue' })
export type DurationValue = z.infer<typeof DurationValue>

export const uint = z.number().meta({ id: 'uint' })
export type uint = z.infer<typeof uint>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

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

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const ShardFailure = z.object({
  index: IndexName.optional(),
  _index: IndexName.optional(),
  node: z.string().optional(),
  _node: z.string().optional(),
  reason: z.lazy(() => ErrorCause),
  shard: integer.optional(),
  _shard: integer.optional(),
  status: z.string().optional(),
  primary: z.boolean().optional()
}).meta({ id: 'ShardFailure' })
export type ShardFailure = z.infer<typeof ShardFailure>

export const ShardStatistics = z.object({
  failed: uint.describe('The number of shards the operation or search attempted to run on but failed.'),
  successful: uint.describe('The number of shards the operation or search succeeded on.'),
  total: uint.describe('The number of shards the operation or search will run on overall.'),
  failures: z.array(ShardFailure).optional(),
  skipped: uint.optional()
}).meta({ id: 'ShardStatistics' })
export type ShardStatistics = z.infer<typeof ShardStatistics>

export const ClusterDetails = z.object({
  status: ClusterSearchStatus,
  indices: z.string(),
  took: DurationValue.optional(),
  timed_out: z.boolean(),
  _shards: ShardStatistics.optional(),
  failures: z.array(ShardFailure).optional()
}).meta({ id: 'ClusterDetails' })
export type ClusterDetails = z.infer<typeof ClusterDetails>

export const ClusterStatistics = z.object({
  skipped: integer,
  successful: integer,
  total: integer,
  running: integer,
  partial: integer,
  failed: integer,
  details: z.record(ClusterAlias, ClusterDetails).optional()
}).meta({ id: 'ClusterStatistics' })
export type ClusterStatistics = z.infer<typeof ClusterStatistics>

export const EpochTime = z.any().meta({ id: 'EpochTime' })
export type EpochTime = z.infer<typeof EpochTime>

/**
 * A date and time, either as a string whose format can depend on the context (defaulting to ISO 8601), or a
 * number of milliseconds since the Epoch. Elasticsearch accepts both as input, but will generally output a string
 * representation.
 */
export const DateTime = z.union([z.string(), EpochTime]).meta({ id: 'DateTime' })
export type DateTime = z.infer<typeof DateTime>

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const AsyncSearchAsyncSearchResponseBase = z.object({
  id: Id.optional(),
  is_partial: z.boolean().describe('When the query is no longer running, this property indicates whether the search failed or was successfully completed on all shards. While the query is running, `is_partial` is always set to `true`.'),
  is_running: z.boolean().describe('Indicates whether the search is still running or has completed. > info > If the search failed after some shards returned their results or the node that is coordinating the async search dies, results may be partial even though `is_running` is `false`.'),
  expiration_time: DateTime.describe('Indicates when the async search will expire.').optional(),
  expiration_time_in_millis: EpochTime,
  start_time: DateTime.optional(),
  start_time_in_millis: EpochTime,
  completion_time: DateTime.describe('Indicates when the async search completed. It is present only when the search has completed.').optional(),
  completion_time_in_millis: EpochTime.optional(),
  error: z.lazy(() => ErrorCause).optional()
}).meta({ id: 'AsyncSearchAsyncSearchResponseBase' })
export type AsyncSearchAsyncSearchResponseBase = z.infer<typeof AsyncSearchAsyncSearchResponseBase>

/**
 * Get the async search status.
 *
 * Get the status of a previously submitted async search request given its identifier, without retrieving search results.
 * If the Elasticsearch security features are enabled, the access to the status of a specific async search is restricted to:
 *
 * * The user or API key that submitted the original async search request.
 * * Users that have the `monitor` cluster privilege or greater privileges.
 */
export const AsyncSearchStatusRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('A unique identifier for the async search.').meta({ found_in: 'path' }),
  keep_alive: Duration.describe('The length of time that the async search needs to be available. Ongoing async searches and any saved search results are deleted after this period.').optional().meta({ found_in: 'query' })
}).meta({ id: 'AsyncSearchStatusRequest' })
export type AsyncSearchStatusRequest = z.infer<typeof AsyncSearchStatusRequest>

export const AsyncSearchStatusStatusResponseBase = z.object({
  ...AsyncSearchAsyncSearchResponseBase.shape,
  _shards: ShardStatistics.describe('The number of shards that have run the query so far.'),
  _clusters: ClusterStatistics.describe('Metadata about clusters involved in the cross-cluster search. It is not shown for local-only searches.').optional(),
  completion_status: integer.describe('If the async search completed, this field shows the status code of the search. For example, `200` indicates that the async search was successfully completed. `503` indicates that the async search was completed with an error.').optional()
}).meta({ id: 'AsyncSearchStatusStatusResponseBase' })
export type AsyncSearchStatusStatusResponseBase = z.infer<typeof AsyncSearchStatusStatusResponseBase>

export const AsyncSearchStatusResponse = AsyncSearchStatusStatusResponseBase.meta({ id: 'AsyncSearchStatusResponse' })
export type AsyncSearchStatusResponse = z.infer<typeof AsyncSearchStatusResponse>
