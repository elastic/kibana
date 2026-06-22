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

/**
 * A date histogram interval. Similar to `Duration` with additional units: `w` (week), `M` (month), `q` (quarter) and
 * `y` (year)
 */
export const DurationLarge = z.string().meta({ id: 'DurationLarge' })
export type DurationLarge = z.infer<typeof DurationLarge>

/** For empty Class assignments */
export const EmptyObject = z.object({
}).meta({ id: 'EmptyObject' })
export type EmptyObject = z.infer<typeof EmptyObject>

export const Metadata = z.record(z.string(), z.any()).meta({ id: 'Metadata' })
export type Metadata = z.infer<typeof Metadata>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const VersionNumber = long.meta({ id: 'VersionNumber' })
export type VersionNumber = z.infer<typeof VersionNumber>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const IlmAllocateAction = z.object({
  number_of_replicas: integer.optional(),
  total_shards_per_node: integer.optional(),
  include: z.record(z.string(), z.string()).optional(),
  exclude: z.record(z.string(), z.string()).optional(),
  require: z.record(z.string(), z.string()).optional()
}).meta({ id: 'IlmAllocateAction' })
export type IlmAllocateAction = z.infer<typeof IlmAllocateAction>

export const IlmDeleteAction = z.object({
  delete_searchable_snapshot: z.boolean().optional()
}).meta({ id: 'IlmDeleteAction' })
export type IlmDeleteAction = z.infer<typeof IlmDeleteAction>

export const IlmDownsampleAction = z.object({
  fixed_interval: DurationLarge,
  wait_timeout: Duration.optional()
}).meta({ id: 'IlmDownsampleAction' })
export type IlmDownsampleAction = z.infer<typeof IlmDownsampleAction>

export const IlmForceMergeAction = z.object({
  max_num_segments: integer,
  index_codec: z.string().optional()
}).meta({ id: 'IlmForceMergeAction' })
export type IlmForceMergeAction = z.infer<typeof IlmForceMergeAction>

export const IlmMigrateAction = z.object({
  enabled: z.boolean().optional()
}).meta({ id: 'IlmMigrateAction' })
export type IlmMigrateAction = z.infer<typeof IlmMigrateAction>

export const IlmRolloverAction = z.object({
  max_size: ByteSize.describe('The `max_size` condition has been deprecated in 9.3.0 and `max_primary_shard_size` should be used instead').optional(),
  max_primary_shard_size: ByteSize.optional(),
  max_age: Duration.optional(),
  max_docs: long.optional(),
  max_primary_shard_docs: long.optional(),
  min_size: ByteSize.optional(),
  min_primary_shard_size: ByteSize.optional(),
  min_age: Duration.optional(),
  min_docs: long.optional(),
  min_primary_shard_docs: long.optional()
}).meta({ id: 'IlmRolloverAction' })
export type IlmRolloverAction = z.infer<typeof IlmRolloverAction>

export const IlmSetPriorityAction = z.object({
  priority: integer.optional()
}).meta({ id: 'IlmSetPriorityAction' })
export type IlmSetPriorityAction = z.infer<typeof IlmSetPriorityAction>

export const IlmSearchableSnapshotAction = z.object({
  snapshot_repository: z.string(),
  force_merge_index: z.boolean().optional()
}).meta({ id: 'IlmSearchableSnapshotAction' })
export type IlmSearchableSnapshotAction = z.infer<typeof IlmSearchableSnapshotAction>

export const IlmShrinkAction = z.object({
  number_of_shards: integer.optional(),
  max_primary_shard_size: ByteSize.optional(),
  allow_write_after_shrink: z.boolean().optional()
}).meta({ id: 'IlmShrinkAction' })
export type IlmShrinkAction = z.infer<typeof IlmShrinkAction>

export const IlmWaitForSnapshotAction = z.object({
  policy: z.string()
}).meta({ id: 'IlmWaitForSnapshotAction' })
export type IlmWaitForSnapshotAction = z.infer<typeof IlmWaitForSnapshotAction>

export const IlmActions = z.object({
  allocate: IlmAllocateAction.describe('Phases allowed: warm, cold.').optional(),
  delete: IlmDeleteAction.describe('Phases allowed: delete.').optional(),
  downsample: IlmDownsampleAction.describe('Phases allowed: hot, warm, cold.').optional(),
  freeze: EmptyObject.describe('The freeze action is a noop in 8.x').optional(),
  forcemerge: IlmForceMergeAction.describe('Phases allowed: hot, warm.').optional(),
  migrate: IlmMigrateAction.describe('Phases allowed: warm, cold.').optional(),
  readonly: EmptyObject.describe('Phases allowed: hot, warm, cold.').optional(),
  rollover: IlmRolloverAction.describe('Phases allowed: hot.').optional(),
  set_priority: IlmSetPriorityAction.describe('Phases allowed: hot, warm, cold.').optional(),
  searchable_snapshot: IlmSearchableSnapshotAction.describe('Phases allowed: hot, cold, frozen.').optional(),
  shrink: IlmShrinkAction.describe('Phases allowed: hot, warm.').optional(),
  unfollow: EmptyObject.describe('Phases allowed: hot, warm, cold, frozen.').optional(),
  wait_for_snapshot: IlmWaitForSnapshotAction.describe('Phases allowed: delete.').optional()
}).meta({ id: 'IlmActions' })
export type IlmActions = z.infer<typeof IlmActions>

export const IlmPhase = z.object({
  actions: IlmActions.optional(),
  min_age: Duration.optional()
}).meta({ id: 'IlmPhase' })
export type IlmPhase = z.infer<typeof IlmPhase>

export const IlmPhases = z.object({
  cold: IlmPhase.optional(),
  delete: IlmPhase.optional(),
  frozen: IlmPhase.optional(),
  hot: IlmPhase.optional(),
  warm: IlmPhase.optional()
}).meta({ id: 'IlmPhases' })
export type IlmPhases = z.infer<typeof IlmPhases>

export const IlmPolicy = z.object({
  phases: IlmPhases,
  _meta: Metadata.describe('Arbitrary metadata that is not automatically generated or used by Elasticsearch.').optional()
}).meta({ id: 'IlmPolicy' })
export type IlmPolicy = z.infer<typeof IlmPolicy>

export const IlmGetLifecycleLifecycle = z.object({
  modified_date: DateTime,
  policy: IlmPolicy,
  version: VersionNumber
}).meta({ id: 'IlmGetLifecycleLifecycle' })
export type IlmGetLifecycleLifecycle = z.infer<typeof IlmGetLifecycleLifecycle>

/** Get lifecycle policies. */
export const IlmGetLifecycleRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('Identifier for the policy.').optional().meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IlmGetLifecycleRequest' })
export type IlmGetLifecycleRequest = z.infer<typeof IlmGetLifecycleRequest>

export const IlmGetLifecycleResponse = z.record(z.string(), IlmGetLifecycleLifecycle).meta({ id: 'IlmGetLifecycleResponse' })
export type IlmGetLifecycleResponse = z.infer<typeof IlmGetLifecycleResponse>
