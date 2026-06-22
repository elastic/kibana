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

export const VersionString = z.string().meta({ id: 'VersionString' })
export type VersionString = z.infer<typeof VersionString>

export const double = z.number().meta({ id: 'double' })
export type double = z.infer<typeof double>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const IndicesSegmentsShardSegmentRouting = z.object({
  node: z.string().describe('The node ID of the node that holds the shard.'),
  primary: z.boolean().describe('If `true`, the shard is a primary shard.'),
  state: z.string().describe('The state of the shard, such as `STARTED` or `RELOCATING`.')
}).meta({ id: 'IndicesSegmentsShardSegmentRouting' })
export type IndicesSegmentsShardSegmentRouting = z.infer<typeof IndicesSegmentsShardSegmentRouting>

export const IndicesSegmentsSegment = z.object({
  attributes: z.record(z.string(), z.string()).describe('Contains information about whether high compression was enabled and per-field vector formats.'),
  committed: z.boolean().describe('If `true`, the segment is synced to disk. Segments that are synced can survive a hard reboot. If `false`, the data from uncommitted segments is also stored in the transaction log so that Elasticsearch is able to replay changes on the next start.'),
  compound: z.boolean().describe('If `true`, Lucene merged all files from the segment into a single file to save file descriptors.'),
  deleted_docs: long.describe('The number of deleted documents as reported by Lucene, which may be higher or lower than the number of delete operations you have performed. This number excludes deletes that were performed recently and do not yet belong to a segment. Deleted documents are cleaned up by the automatic merge process if it makes sense to do so. Also, Elasticsearch creates extra deleted documents to internally track the recent history of operations on a shard.'),
  generation: integer.describe('Generation number, such as `0`. Elasticsearch increments this generation number for each segment written then uses this number to derive the segment name.'),
  search: z.boolean().describe('If `true`, the segment is searchable. If `false`, the segment has most likely been written to disk but needs a refresh to be searchable.'),
  size_in_bytes: double.describe('Disk space used by the segment, in bytes.'),
  num_docs: long.describe('The number of documents as reported by Lucene. This excludes deleted documents and counts any nested documents separately from their parents. It also excludes documents which were indexed recently and do not yet belong to a segment.'),
  version: VersionString.describe('Version of Lucene used to write the segment.')
}).meta({ id: 'IndicesSegmentsSegment' })
export type IndicesSegmentsSegment = z.infer<typeof IndicesSegmentsSegment>

export const IndicesSegmentsShardsSegment = z.object({
  num_committed_segments: integer,
  routing: IndicesSegmentsShardSegmentRouting,
  num_search_segments: integer,
  segments: z.record(z.string(), IndicesSegmentsSegment)
}).meta({ id: 'IndicesSegmentsShardsSegment' })
export type IndicesSegmentsShardsSegment = z.infer<typeof IndicesSegmentsShardsSegment>

export const IndicesSegmentsIndexSegment = z.object({
  shards: z.record(z.string(), z.union([IndicesSegmentsShardsSegment, z.array(IndicesSegmentsShardsSegment)]))
}).meta({ id: 'IndicesSegmentsIndexSegment' })
export type IndicesSegmentsIndexSegment = z.infer<typeof IndicesSegmentsIndexSegment>

/**
 * Get index segments.
 *
 * Get low-level information about the Lucene segments in index shards.
 * For data streams, the API returns information about the stream's backing indices.
 */
export const IndicesSegmentsRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('Comma-separated list of data streams, indices, and aliases used to limit the request. Supports wildcards (`*`). To target all data streams and indices, omit this parameter or use `*` or `_all`.').optional().meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesSegmentsRequest' })
export type IndicesSegmentsRequest = z.infer<typeof IndicesSegmentsRequest>

export const IndicesSegmentsResponse = z.object({
  indices: z.record(z.string(), IndicesSegmentsIndexSegment),
  _shards: ShardStatistics
}).meta({ id: 'IndicesSegmentsResponse' })
export type IndicesSegmentsResponse = z.infer<typeof IndicesSegmentsResponse>
