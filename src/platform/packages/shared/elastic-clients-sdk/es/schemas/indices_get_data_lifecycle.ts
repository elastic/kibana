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

export const DataStreamName = z.string().meta({ id: 'DataStreamName' })
export type DataStreamName = z.infer<typeof DataStreamName>

export const DataStreamNames = z.union([DataStreamName, z.array(DataStreamName)]).meta({ id: 'DataStreamNames' })
export type DataStreamNames = z.infer<typeof DataStreamNames>

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

export const ExpandWildcard = z.enum(['all', 'open', 'closed', 'hidden', 'none']).meta({ id: 'ExpandWildcard' })
export type ExpandWildcard = z.infer<typeof ExpandWildcard>

export const ExpandWildcards = z.union([ExpandWildcard, z.array(ExpandWildcard)]).meta({ id: 'ExpandWildcards' })
export type ExpandWildcards = z.infer<typeof ExpandWildcards>

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

export const IndicesGetDataLifecycleDataStreamWithLifecycle = z.object({
  name: DataStreamName,
  lifecycle: IndicesDataStreamLifecycleWithRollover.optional()
}).meta({ id: 'IndicesGetDataLifecycleDataStreamWithLifecycle' })
export type IndicesGetDataLifecycleDataStreamWithLifecycle = z.infer<typeof IndicesGetDataLifecycleDataStreamWithLifecycle>

/**
 * Get data stream lifecycles.
 *
 * Get the data stream lifecycle configuration of one or more data streams.
 */
export const IndicesGetDataLifecycleRequest = z.object({
  ...RequestBase.shape,
  name: DataStreamNames.describe('Comma-separated list of data streams to limit the request. Supports wildcards (`*`). To target all data streams, omit this parameter or use `*` or `_all`.').meta({ found_in: 'path' }),
  expand_wildcards: ExpandWildcards.describe('Type of data stream that wildcard patterns can match. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  include_defaults: z.boolean().describe('If `true`, return all default settings in the response.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesGetDataLifecycleRequest' })
export type IndicesGetDataLifecycleRequest = z.infer<typeof IndicesGetDataLifecycleRequest>

export const IndicesGetDataLifecycleResponse = z.object({
  data_streams: z.array(IndicesGetDataLifecycleDataStreamWithLifecycle)
}).meta({ id: 'IndicesGetDataLifecycleResponse' })
export type IndicesGetDataLifecycleResponse = z.infer<typeof IndicesGetDataLifecycleResponse>
