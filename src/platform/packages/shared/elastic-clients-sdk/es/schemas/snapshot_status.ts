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

export const EpochTime = z.any().meta({ id: 'EpochTime' })
export type EpochTime = z.infer<typeof EpochTime>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const Names = z.union([Name, z.array(Name)]).meta({ id: 'Names' })
export type Names = z.infer<typeof Names>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const Uuid = z.string().meta({ id: 'Uuid' })
export type Uuid = z.infer<typeof Uuid>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const SnapshotFileCountSnapshotStats = z.object({
  file_count: integer,
  size_in_bytes: long
}).meta({ id: 'SnapshotFileCountSnapshotStats' })
export type SnapshotFileCountSnapshotStats = z.infer<typeof SnapshotFileCountSnapshotStats>

export const SnapshotShardsStats = z.object({
  done: long.describe('The number of shards that initialized, started, and finalized successfully.'),
  failed: long.describe('The number of shards that failed to be included in the snapshot.'),
  finalizing: long.describe('The number of shards that are finalizing but are not done.'),
  initializing: long.describe('The number of shards that are still initializing.'),
  started: long.describe('The number of shards that have started but are not finalized.'),
  total: long.describe('The total number of shards included in the snapshot.')
}).meta({ id: 'SnapshotShardsStats' })
export type SnapshotShardsStats = z.infer<typeof SnapshotShardsStats>

export const SnapshotShardsStatsStage = z.enum(['DONE', 'FAILURE', 'FINALIZE', 'INIT', 'STARTED']).meta({ id: 'SnapshotShardsStatsStage' })
export type SnapshotShardsStatsStage = z.infer<typeof SnapshotShardsStatsStage>

export const SnapshotShardsStatsSummaryItem = z.object({
  file_count: long,
  size_in_bytes: long
}).meta({ id: 'SnapshotShardsStatsSummaryItem' })
export type SnapshotShardsStatsSummaryItem = z.infer<typeof SnapshotShardsStatsSummaryItem>

export const SnapshotShardsStatsSummary = z.object({
  incremental: SnapshotShardsStatsSummaryItem,
  total: SnapshotShardsStatsSummaryItem,
  start_time_in_millis: EpochTime,
  time: Duration.optional(),
  time_in_millis: DurationValue
}).meta({ id: 'SnapshotShardsStatsSummary' })
export type SnapshotShardsStatsSummary = z.infer<typeof SnapshotShardsStatsSummary>

export const SnapshotSnapshotShardsStatus = z.object({
  stage: SnapshotShardsStatsStage,
  stats: SnapshotShardsStatsSummary
}).meta({ id: 'SnapshotSnapshotShardsStatus' })
export type SnapshotSnapshotShardsStatus = z.infer<typeof SnapshotSnapshotShardsStatus>

export const SnapshotSnapshotStats = z.object({
  incremental: SnapshotFileCountSnapshotStats.describe('The number and size of files that still need to be copied as part of the incremental snapshot. For completed snapshots, this property indicates the number and size of files that were not already in the repository and were copied as part of the incremental snapshot.'),
  start_time_in_millis: EpochTime.describe('The time, in milliseconds, when the snapshot creation process started.'),
  time: Duration.optional(),
  time_in_millis: DurationValue.describe('The total time, in milliseconds, that it took for the snapshot process to complete.'),
  total: SnapshotFileCountSnapshotStats.describe('The total number and size of files that are referenced by the snapshot.')
}).meta({ id: 'SnapshotSnapshotStats' })
export type SnapshotSnapshotStats = z.infer<typeof SnapshotSnapshotStats>

export const SnapshotSnapshotIndexStats = z.object({
  shards: z.record(z.string(), SnapshotSnapshotShardsStatus),
  shards_stats: SnapshotShardsStats,
  stats: SnapshotSnapshotStats
}).meta({ id: 'SnapshotSnapshotIndexStats' })
export type SnapshotSnapshotIndexStats = z.infer<typeof SnapshotSnapshotIndexStats>

export const SnapshotStatus = z.object({
  include_global_state: z.boolean().describe('Indicates whether the current cluster state is included in the snapshot.'),
  indices: z.record(z.string(), SnapshotSnapshotIndexStats),
  repository: z.string().describe('The name of the repository that includes the snapshot.'),
  shards_stats: SnapshotShardsStats.describe('Statistics for the shards in the snapshot.'),
  snapshot: z.string().describe('The name of the snapshot.'),
  state: z.string().describe('The current snapshot state: * `FAILED`: The snapshot finished with an error and failed to store any data. * `STARTED`: The snapshot is currently running. * `SUCCESS`: The snapshot completed.'),
  stats: SnapshotSnapshotStats.describe('Details about the number (`file_count`) and size (`size_in_bytes`) of files included in the snapshot.'),
  uuid: Uuid.describe('The universally unique identifier (UUID) for the snapshot.')
}).meta({ id: 'SnapshotStatus' })
export type SnapshotStatus = z.infer<typeof SnapshotStatus>

/**
 * Get the snapshot status.
 *
 * Get a detailed description of the current state for each shard participating in the snapshot.
 *
 * Note that this API should be used only to obtain detailed shard-level information for ongoing snapshots.
 * If this detail is not needed or you want to obtain information about one or more existing snapshots, use the get snapshot API.
 *
 * If you omit the `<snapshot>` request path parameter, the request retrieves information only for currently running snapshots.
 * This usage is preferred.
 * If needed, you can specify `<repository>` and `<snapshot>` to retrieve information for specific snapshots, even if they're not currently running.
 *
 * Note that the stats will not be available for any shard snapshots in an ongoing snapshot completed by a node that (even momentarily) left the cluster.
 * Loading the stats from the repository is an expensive operation (see the WARNING below).
 * Therefore the stats values for such shards will be -1 even though the "stage" value will be "DONE", in order to minimize latency.
 * A "description" field will be present for a shard snapshot completed by a departed node explaining why the shard snapshot's stats results are invalid.
 * Consequently, the total stats for the index will be less than expected due to the missing values from these shards.
 *
 * WARNING: Using the API to return the status of any snapshots other than currently running snapshots can be expensive.
 * The API requires a read from the repository for each shard in each snapshot.
 * For example, if you have 100 snapshots with 1,000 shards each, an API request that includes all snapshots will require 100,000 reads (100 snapshots x 1,000 shards).
 *
 * Depending on the latency of your storage, such requests can take an extremely long time to return results.
 * These requests can also tax machine resources and, when using cloud storage, incur high processing costs.
 */
export const SnapshotStatusRequest = z.object({
  ...RequestBase.shape,
  repository: Name.describe('The snapshot repository name used to limit the request. It supports wildcards (`*`) if `<snapshot>` isn\'t specified.').optional().meta({ found_in: 'path' }),
  snapshot: Names.describe('A comma-separated list of snapshots to retrieve status for. The default is currently running snapshots. Wildcards (`*`) are not supported.').optional().meta({ found_in: 'path' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error for any snapshots that are unavailable. If `true`, the request ignores snapshots that are unavailable, such as those that are corrupted or temporarily cannot be returned.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('The period to wait for the master node. If the master node is not available before the timeout expires, the request fails and returns an error. To indicate that the request should never timeout, set it to `-1`.').optional().meta({ found_in: 'query' })
}).meta({ id: 'SnapshotStatusRequest' })
export type SnapshotStatusRequest = z.infer<typeof SnapshotStatusRequest>

export const SnapshotStatusResponse = z.object({
  snapshots: z.array(SnapshotStatus)
}).meta({ id: 'SnapshotStatusResponse' })
export type SnapshotStatusResponse = z.infer<typeof SnapshotStatusResponse>
