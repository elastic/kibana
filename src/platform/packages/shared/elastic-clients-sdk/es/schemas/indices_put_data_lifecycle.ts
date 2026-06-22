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

export const AcknowledgedResponseBase = z.object({
  acknowledged: z.boolean().describe('For a successful response, this value is always true. On failure, an exception is returned instead.')
}).meta({ id: 'AcknowledgedResponseBase' })
export type AcknowledgedResponseBase = z.infer<typeof AcknowledgedResponseBase>

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

/**
 * Update data stream lifecycles.
 *
 * Update the data stream lifecycle of the specified data streams.
 */
export const IndicesPutDataLifecycleRequest = z.object({
  ...RequestBase.shape,
  name: DataStreamNames.describe('Comma-separated list of data streams used to limit the request. Supports wildcards (`*`). To target all data streams use `*` or `_all`.').meta({ found_in: 'path' }),
  expand_wildcards: ExpandWildcards.describe('Type of data stream that wildcard patterns can match. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  data_retention: Duration.describe('If defined, every document added to this data stream will be stored at least for this time frame. Any time after this duration the document could be deleted. When empty, every document in this data stream will be stored indefinitely.').optional().meta({ found_in: 'body' }),
  downsampling: z.array(IndicesDownsamplingRound).describe('The downsampling configuration to execute for the managed backing index after rollover.').optional().meta({ found_in: 'body' }),
  downsampling_method: IndicesSamplingMethod.describe('The method used to downsample the data. There are two options `aggregate` and `last_value`. It requires `downsampling` to be defined. Defaults to `aggregate`.').optional().meta({ found_in: 'body' }),
  enabled: z.boolean().describe('If defined, it turns data stream lifecycle on/off (`true`/`false`) for this data stream. A data stream lifecycle that\'s disabled (enabled: `false`) will have no effect on the data stream.').optional().meta({ found_in: 'body' })
}).meta({ id: 'IndicesPutDataLifecycleRequest' })
export type IndicesPutDataLifecycleRequest = z.infer<typeof IndicesPutDataLifecycleRequest>

export const IndicesPutDataLifecycleResponse = AcknowledgedResponseBase.meta({ id: 'IndicesPutDataLifecycleResponse' })
export type IndicesPutDataLifecycleResponse = z.infer<typeof IndicesPutDataLifecycleResponse>
