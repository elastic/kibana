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

export const EpochTime = z.any().meta({ id: 'EpochTime' })
export type EpochTime = z.infer<typeof EpochTime>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const Indices = z.union([IndexName, z.array(IndexName)]).meta({ id: 'Indices' })
export type Indices = z.infer<typeof Indices>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const IndicesDownsamplingRound = z.object({
  after: Duration.describe('The duration since rollover when this downsampling round should execute'),
  fixed_interval: DurationLarge.describe('The downsample interval.')
}).meta({ id: 'IndicesDownsamplingRound' })
export type IndicesDownsamplingRound = z.infer<typeof IndicesDownsamplingRound>

export const IndicesSamplingMethod = z.enum(['aggregate', 'last_value']).meta({ id: 'IndicesSamplingMethod' })
export type IndicesSamplingMethod = z.infer<typeof IndicesSamplingMethod>

/** Data stream lifecycle denotes that a data stream is managed by the data stream lifecycle and contains the configuration. */
export const IndicesDataStreamLifecycle = z.object({
  data_retention: Duration.describe('If defined, every document added to this data stream will be stored at least for this time frame. Any time after this duration the document could be deleted. When empty, every document in this data stream will be stored indefinitely.').optional(),
  downsampling: z.array(IndicesDownsamplingRound).describe('The list of downsampling rounds to execute as part of this downsampling configuration').optional(),
  downsampling_method: IndicesSamplingMethod.describe('The method used to downsample the data. There are two options `aggregate` and `last_value`. It requires `downsampling` to be defined. Defaults to `aggregate`.').optional(),
  enabled: z.boolean().describe('If defined, it turns data stream lifecycle on/off (`true`/`false`) for this data stream. A data stream lifecycle that\'s disabled (enabled: `false`) will have no effect on the data stream.').optional(),
  frozen_after: Duration.describe('Only available with feature flag dlm_searchable_snapshots.').optional()
}).meta({ id: 'IndicesDataStreamLifecycle' })
export type IndicesDataStreamLifecycle = z.infer<typeof IndicesDataStreamLifecycle>

export const IndicesDataStreamLifecycleRolloverConditions = z.object({
  min_age: Duration.optional(),
  max_age: z.string().optional(),
  min_docs: long.optional(),
  max_docs: long.optional(),
  min_size: ByteSize.optional(),
  max_size: ByteSize.optional(),
  min_primary_shard_size: ByteSize.optional(),
  max_primary_shard_size: ByteSize.optional(),
  min_primary_shard_docs: long.optional(),
  max_primary_shard_docs: long.optional()
}).meta({ id: 'IndicesDataStreamLifecycleRolloverConditions' })
export type IndicesDataStreamLifecycleRolloverConditions = z.infer<typeof IndicesDataStreamLifecycleRolloverConditions>

/**
 * Data stream lifecycle with rollover can be used to display the configuration including the default rollover conditions,
 * if asked.
 */
export const IndicesDataStreamLifecycleWithRollover = z.object({
  ...IndicesDataStreamLifecycle.shape,
  rollover: IndicesDataStreamLifecycleRolloverConditions.describe('The conditions which will trigger the rollover of a backing index as configured by the cluster setting `cluster.lifecycle.default.rollover`. This property is an implementation detail and it will only be retrieved when the query param `include_defaults` is set to true. The contents of this field are subject to change.').optional()
}).meta({ id: 'IndicesDataStreamLifecycleWithRollover' })
export type IndicesDataStreamLifecycleWithRollover = z.infer<typeof IndicesDataStreamLifecycleWithRollover>

export const IndicesExplainDataLifecycleDataStreamLifecycleExplain = z.object({
  index: IndexName,
  managed_by_lifecycle: z.boolean(),
  index_creation_date_millis: EpochTime.optional(),
  time_since_index_creation: Duration.optional(),
  rollover_date_millis: EpochTime.optional(),
  time_since_rollover: Duration.optional(),
  lifecycle: IndicesDataStreamLifecycleWithRollover.optional(),
  generation_time: Duration.optional(),
  error: z.string().optional()
}).meta({ id: 'IndicesExplainDataLifecycleDataStreamLifecycleExplain' })
export type IndicesExplainDataLifecycleDataStreamLifecycleExplain = z.infer<typeof IndicesExplainDataLifecycleDataStreamLifecycleExplain>

/**
 * Get the status for a data stream lifecycle.
 *
 * Get information about an index or data stream's current data stream lifecycle status, such as time since index creation, time since rollover, the lifecycle configuration managing the index, or any errors encountered during lifecycle execution.
 */
export const IndicesExplainDataLifecycleRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('Comma-separated list of index names to explain').meta({ found_in: 'path' }),
  include_defaults: z.boolean().describe('Indicates if the API should return the default values the system uses for the index\'s lifecycle').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesExplainDataLifecycleRequest' })
export type IndicesExplainDataLifecycleRequest = z.infer<typeof IndicesExplainDataLifecycleRequest>

export const IndicesExplainDataLifecycleResponse = z.object({
  indices: z.record(IndexName, IndicesExplainDataLifecycleDataStreamLifecycleExplain)
}).meta({ id: 'IndicesExplainDataLifecycleResponse' })
export type IndicesExplainDataLifecycleResponse = z.infer<typeof IndicesExplainDataLifecycleResponse>
