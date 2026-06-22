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

export const DurationValue = z.any().meta({ id: 'DurationValue' })
export type DurationValue = z.infer<typeof DurationValue>

export const ExpandWildcard = z.enum(['all', 'open', 'closed', 'hidden', 'none']).meta({ id: 'ExpandWildcard' })
export type ExpandWildcard = z.infer<typeof ExpandWildcard>

export const ExpandWildcards = z.union([ExpandWildcard, z.array(ExpandWildcard)]).meta({ id: 'ExpandWildcards' })
export type ExpandWildcards = z.infer<typeof ExpandWildcards>

export const Host = z.string().meta({ id: 'Host' })
export type Host = z.infer<typeof Host>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const Indices = z.union([IndexName, z.array(IndexName)]).meta({ id: 'Indices' })
export type Indices = z.infer<typeof Indices>

export const Ip = z.string().meta({ id: 'Ip' })
export type Ip = z.infer<typeof Ip>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const float = z.number().meta({ id: 'float' })
export type float = z.infer<typeof float>

export const Percentage = z.union([z.string(), float]).meta({ id: 'Percentage' })
export type Percentage = z.infer<typeof Percentage>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const TransportAddress = z.string().meta({ id: 'TransportAddress' })
export type TransportAddress = z.infer<typeof TransportAddress>

export const Uuid = z.string().meta({ id: 'Uuid' })
export type Uuid = z.infer<typeof Uuid>

export const VersionString = z.string().meta({ id: 'VersionString' })
export type VersionString = z.infer<typeof VersionString>

export const IndicesRecoveryFileDetails = z.object({
  length: long,
  name: z.string(),
  recovered: long
}).meta({ id: 'IndicesRecoveryFileDetails' })
export type IndicesRecoveryFileDetails = z.infer<typeof IndicesRecoveryFileDetails>

export const IndicesRecoveryRecoveryBytes = z.object({
  percent: Percentage,
  recovered: ByteSize.optional(),
  recovered_in_bytes: ByteSize,
  recovered_from_snapshot: ByteSize.optional(),
  recovered_from_snapshot_in_bytes: ByteSize.optional(),
  reused: ByteSize.optional(),
  reused_in_bytes: ByteSize,
  total: ByteSize.optional(),
  total_in_bytes: ByteSize
}).meta({ id: 'IndicesRecoveryRecoveryBytes' })
export type IndicesRecoveryRecoveryBytes = z.infer<typeof IndicesRecoveryRecoveryBytes>

export const IndicesRecoveryRecoveryFiles = z.object({
  details: z.array(IndicesRecoveryFileDetails).optional(),
  percent: Percentage,
  recovered: long,
  reused: long,
  total: long
}).meta({ id: 'IndicesRecoveryRecoveryFiles' })
export type IndicesRecoveryRecoveryFiles = z.infer<typeof IndicesRecoveryRecoveryFiles>

export const IndicesRecoveryRecoveryIndexStatus = z.object({
  bytes: IndicesRecoveryRecoveryBytes.optional(),
  files: IndicesRecoveryRecoveryFiles,
  size: IndicesRecoveryRecoveryBytes,
  source_throttle_time: Duration.optional(),
  source_throttle_time_in_millis: DurationValue,
  target_throttle_time: Duration.optional(),
  target_throttle_time_in_millis: DurationValue,
  total_time: Duration.optional(),
  total_time_in_millis: DurationValue
}).meta({ id: 'IndicesRecoveryRecoveryIndexStatus' })
export type IndicesRecoveryRecoveryIndexStatus = z.infer<typeof IndicesRecoveryRecoveryIndexStatus>

export const IndicesRecoveryRecoveryOrigin = z.object({
  hostname: z.string().optional(),
  host: Host.optional(),
  transport_address: TransportAddress.optional(),
  id: Id.optional(),
  ip: Ip.optional(),
  name: Name.optional(),
  bootstrap_new_history_uuid: z.boolean().optional(),
  repository: Name.optional(),
  snapshot: Name.optional(),
  version: VersionString.optional(),
  restoreUUID: Uuid.optional(),
  index: IndexName.optional()
}).meta({ id: 'IndicesRecoveryRecoveryOrigin' })
export type IndicesRecoveryRecoveryOrigin = z.infer<typeof IndicesRecoveryRecoveryOrigin>

export const IndicesRecoveryRecoveryStage = z.enum(['INIT', 'INDEX', 'VERIFY_INDEX', 'TRANSLOG', 'FINALIZE', 'DONE']).meta({ id: 'IndicesRecoveryRecoveryStage' })
export type IndicesRecoveryRecoveryStage = z.infer<typeof IndicesRecoveryRecoveryStage>

export const IndicesRecoveryRecoveryStartStatus = z.object({
  check_index_time: Duration.optional(),
  check_index_time_in_millis: DurationValue,
  total_time: Duration.optional(),
  total_time_in_millis: DurationValue
}).meta({ id: 'IndicesRecoveryRecoveryStartStatus' })
export type IndicesRecoveryRecoveryStartStatus = z.infer<typeof IndicesRecoveryRecoveryStartStatus>

export const IndicesRecoveryTranslogStatus = z.object({
  percent: Percentage,
  recovered: long,
  total: long,
  total_on_start: long,
  total_time: Duration.optional(),
  total_time_in_millis: DurationValue
}).meta({ id: 'IndicesRecoveryTranslogStatus' })
export type IndicesRecoveryTranslogStatus = z.infer<typeof IndicesRecoveryTranslogStatus>

export const IndicesRecoveryRecoveryType = z.enum(['EMPTY_STORE', 'EXISTING_STORE', 'LOCAL_SHARDS', 'PEER', 'SNAPSHOT']).meta({ id: 'IndicesRecoveryRecoveryType' })
export type IndicesRecoveryRecoveryType = z.infer<typeof IndicesRecoveryRecoveryType>

export const IndicesRecoveryVerifyIndex = z.object({
  check_index_time: Duration.optional(),
  check_index_time_in_millis: DurationValue,
  total_time: Duration.optional(),
  total_time_in_millis: DurationValue
}).meta({ id: 'IndicesRecoveryVerifyIndex' })
export type IndicesRecoveryVerifyIndex = z.infer<typeof IndicesRecoveryVerifyIndex>

export const IndicesRecoveryShardRecovery = z.object({
  id: long,
  index: IndicesRecoveryRecoveryIndexStatus,
  primary: z.boolean(),
  source: IndicesRecoveryRecoveryOrigin,
  stage: IndicesRecoveryRecoveryStage.describe('The recovery stage.'),
  start: IndicesRecoveryRecoveryStartStatus.optional(),
  start_time: DateTime.optional(),
  start_time_in_millis: EpochTime,
  stop_time: DateTime.optional(),
  stop_time_in_millis: EpochTime.optional(),
  target: IndicesRecoveryRecoveryOrigin,
  total_time: Duration.optional(),
  total_time_in_millis: DurationValue,
  translog: IndicesRecoveryTranslogStatus,
  type: IndicesRecoveryRecoveryType.describe('The recovery source type.'),
  verify_index: IndicesRecoveryVerifyIndex
}).meta({ id: 'IndicesRecoveryShardRecovery' })
export type IndicesRecoveryShardRecovery = z.infer<typeof IndicesRecoveryShardRecovery>

export const IndicesRecoveryRecoveryStatus = z.object({
  shards: z.array(IndicesRecoveryShardRecovery)
}).meta({ id: 'IndicesRecoveryRecoveryStatus' })
export type IndicesRecoveryRecoveryStatus = z.infer<typeof IndicesRecoveryRecoveryStatus>

/**
 * Get index recovery information.
 *
 * Get information about ongoing and completed shard recoveries for one or more indices.
 * For data streams, the API returns information for the stream's backing indices.
 *
 * All recoveries, whether ongoing or complete, are kept in the cluster state and may be reported on at any time.
 *
 * Shard recovery is the process of initializing a shard copy, such as restoring a primary shard from a snapshot or creating a replica shard from a primary shard.
 * When a shard recovery completes, the recovered shard is available for search and indexing.
 *
 * Recovery automatically occurs during the following processes:
 *
 * * When creating an index for the first time.
 * * When a node rejoins the cluster and starts up any missing primary shard copies using the data that it holds in its data path.
 * * Creation of new replica shard copies from the primary.
 * * Relocation of a shard copy to a different node in the same cluster.
 * * A snapshot restore operation.
 * * A clone, shrink, or split operation.
 *
 * You can determine the cause of a shard recovery using the recovery or cat recovery APIs.
 *
 * The index recovery API reports information about completed recoveries only for shard copies that currently exist in the cluster.
 * It only reports the last recovery for each shard copy and does not report historical information about earlier recoveries, nor does it report information about the recoveries of shard copies that no longer exist.
 * This means that if a shard copy completes a recovery and then Elasticsearch relocates it onto a different node then the information about the original recovery will not be shown in the recovery API.
 */
export const IndicesRecoveryRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('Comma-separated list of data streams, indices, and aliases used to limit the request. Supports wildcards (`*`). To target all data streams and indices, omit this parameter or use `*` or `_all`.').optional().meta({ found_in: 'path' }),
  active_only: z.boolean().describe('If `true`, the response only includes ongoing shard recoveries.').optional().meta({ found_in: 'query' }),
  detailed: z.boolean().describe('If `true`, the response includes detailed information about shard recoveries.').optional().meta({ found_in: 'query' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesRecoveryRequest' })
export type IndicesRecoveryRequest = z.infer<typeof IndicesRecoveryRequest>

export const IndicesRecoveryResponse = z.record(IndexName, IndicesRecoveryRecoveryStatus).meta({ id: 'IndicesRecoveryResponse' })
export type IndicesRecoveryResponse = z.infer<typeof IndicesRecoveryResponse>
