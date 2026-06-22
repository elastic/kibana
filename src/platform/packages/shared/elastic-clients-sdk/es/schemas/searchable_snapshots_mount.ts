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

export const SearchableSnapshotsMountMountedSnapshot = z.object({
  snapshot: Name,
  indices: Indices,
  shards: ShardStatistics
}).meta({ id: 'SearchableSnapshotsMountMountedSnapshot' })
export type SearchableSnapshotsMountMountedSnapshot = z.infer<typeof SearchableSnapshotsMountMountedSnapshot>

export const SearchableSnapshotsMountStorageOption = z.enum(['full_copy', 'shared_cache']).meta({ id: 'SearchableSnapshotsMountStorageOption' })
export type SearchableSnapshotsMountStorageOption = z.infer<typeof SearchableSnapshotsMountStorageOption>

/**
 * Mount a snapshot.
 *
 * Mount a snapshot as a searchable snapshot index.
 * Do not use this API for snapshots managed by index lifecycle management (ILM).
 * Manually mounting ILM-managed snapshots can interfere with ILM processes.
 */
export const SearchableSnapshotsMountRequest = z.object({
  ...RequestBase.shape,
  repository: Name.describe('The name of the repository containing the snapshot of the index to mount.').meta({ found_in: 'path' }),
  snapshot: Name.describe('The name of the snapshot of the index to mount.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for the master node. If the master node is not available before the timeout expires, the request fails and returns an error. To indicate that the request should never timeout, set it to `-1`.').optional().meta({ found_in: 'query' }),
  wait_for_completion: z.boolean().describe('If true, the request blocks until the operation is complete.').optional().meta({ found_in: 'query' }),
  storage: SearchableSnapshotsMountStorageOption.describe('The mount option for the searchable snapshot index. For further information on mount options, refer to: [Mount options](https://www.elastic.co/docs/deploy-manage/tools/snapshot-and-restore/searchable-snapshots#searchable-snapshot-mount-storage-options)').optional().meta({ found_in: 'query' }),
  index: IndexName.describe('The name of the index contained in the snapshot whose data is to be mounted. If no `renamed_index` is specified, this name will also be used to create the new index.').meta({ found_in: 'body' }),
  renamed_index: IndexName.describe('The name of the index that will be created.').optional().meta({ found_in: 'body' }),
  index_settings: z.record(z.string(), z.any()).describe('The settings that should be added to the index when it is mounted.').optional().meta({ found_in: 'body' }),
  ignore_index_settings: z.array(z.string()).describe('The names of settings that should be removed from the index when it is mounted.').optional().meta({ found_in: 'body' })
}).meta({ id: 'SearchableSnapshotsMountRequest' })
export type SearchableSnapshotsMountRequest = z.infer<typeof SearchableSnapshotsMountRequest>

export const SearchableSnapshotsMountResponse = z.object({
  snapshot: SearchableSnapshotsMountMountedSnapshot
}).meta({ id: 'SearchableSnapshotsMountResponse' })
export type SearchableSnapshotsMountResponse = z.infer<typeof SearchableSnapshotsMountResponse>
