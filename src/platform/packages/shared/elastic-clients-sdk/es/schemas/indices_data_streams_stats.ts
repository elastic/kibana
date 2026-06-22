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

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const ByteSize = z.union([long, z.string()]).meta({ id: 'ByteSize' })
export type ByteSize = z.infer<typeof ByteSize>

export const EpochTime = z.any().meta({ id: 'EpochTime' })
export type EpochTime = z.infer<typeof EpochTime>

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

export const ExpandWildcard = z.enum(['all', 'open', 'closed', 'hidden', 'none']).meta({ id: 'ExpandWildcard' })
export type ExpandWildcard = z.infer<typeof ExpandWildcard>

export const ExpandWildcards = z.union([ExpandWildcard, z.array(ExpandWildcard)]).meta({ id: 'ExpandWildcards' })
export type ExpandWildcards = z.infer<typeof ExpandWildcards>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const Indices = z.union([IndexName, z.array(IndexName)]).meta({ id: 'Indices' })
export type Indices = z.infer<typeof Indices>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

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

export const uint = z.number().meta({ id: 'uint' })
export type uint = z.infer<typeof uint>

export const ShardStatistics = z.object({
  failed: uint.describe('The number of shards the operation or search attempted to run on but failed.'),
  successful: uint.describe('The number of shards the operation or search succeeded on.'),
  total: uint.describe('The number of shards the operation or search will run on overall.'),
  failures: z.array(ShardFailure).optional(),
  skipped: uint.optional()
}).meta({ id: 'ShardStatistics' })
export type ShardStatistics = z.infer<typeof ShardStatistics>

export const IndicesDataStreamsStatsDataStreamsStatsItem = z.object({
  backing_indices: integer.describe('Current number of backing indices for the data stream.'),
  data_stream: Name.describe('Name of the data stream.'),
  maximum_timestamp: EpochTime.describe('The data stream’s highest `@timestamp` value, converted to milliseconds since the Unix epoch. NOTE: This timestamp is provided as a best effort. The data stream may contain `@timestamp` values higher than this if one or more of the following conditions are met: The stream contains closed backing indices; Backing indices with a lower generation contain higher `@timestamp` values.'),
  store_size: ByteSize.describe('Total size of all shards for the data stream’s backing indices. This parameter is only returned if the `human` query parameter is `true`.').optional(),
  store_size_bytes: long.describe('Total size, in bytes, of all shards for the data stream’s backing indices.')
}).meta({ id: 'IndicesDataStreamsStatsDataStreamsStatsItem' })
export type IndicesDataStreamsStatsDataStreamsStatsItem = z.infer<typeof IndicesDataStreamsStatsDataStreamsStatsItem>

/**
 * Get data stream stats.
 *
 * Get statistics for one or more data streams.
 */
export const IndicesDataStreamsStatsRequest = z.object({
  ...RequestBase.shape,
  name: Indices.describe('Comma-separated list of data streams used to limit the request. Wildcard expressions (`*`) are supported. To target all data streams in a cluster, omit this parameter or use `*`.').optional().meta({ found_in: 'path' }),
  expand_wildcards: ExpandWildcards.describe('Type of data stream that wildcard patterns can match. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesDataStreamsStatsRequest' })
export type IndicesDataStreamsStatsRequest = z.infer<typeof IndicesDataStreamsStatsRequest>

export const IndicesDataStreamsStatsResponse = z.object({
  _shards: ShardStatistics.describe('Contains information about shards that attempted to execute the request.'),
  backing_indices: integer.describe('Total number of backing indices for the selected data streams.'),
  data_stream_count: integer.describe('Total number of selected data streams.'),
  data_streams: z.array(IndicesDataStreamsStatsDataStreamsStatsItem).describe('Contains statistics for the selected data streams.'),
  total_store_sizes: ByteSize.describe('Total size of all shards for the selected data streams. This property is included only if the `human` query parameter is `true`').optional(),
  total_store_size_bytes: long.describe('Total size, in bytes, of all shards for the selected data streams.')
}).meta({ id: 'IndicesDataStreamsStatsResponse' })
export type IndicesDataStreamsStatsResponse = z.infer<typeof IndicesDataStreamsStatsResponse>
