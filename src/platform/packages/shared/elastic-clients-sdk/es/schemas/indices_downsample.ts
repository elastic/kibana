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
 * A date histogram interval. Similar to `Duration` with additional units: `w` (week), `M` (month), `q` (quarter) and
 * `y` (year)
 */
export const DurationLarge = z.string().meta({ id: 'DurationLarge' })
export type DurationLarge = z.infer<typeof DurationLarge>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const IndicesSamplingMethod = z.enum(['aggregate', 'last_value']).meta({ id: 'IndicesSamplingMethod' })
export type IndicesSamplingMethod = z.infer<typeof IndicesSamplingMethod>

export const IndicesDownsampleConfig = z.object({
  fixed_interval: DurationLarge.describe('The interval at which to aggregate the original time series index.'),
  sampling_method: IndicesSamplingMethod.describe('The sampling method used to reduce the documents; it can be either `aggregate` or `last_value`. Defaults to `aggregate`.').optional()
}).meta({ id: 'IndicesDownsampleConfig' })
export type IndicesDownsampleConfig = z.infer<typeof IndicesDownsampleConfig>

/**
 * Downsample an index.
 *
 * Downsamples a time series (TSDS) index and reduces its size by keeping the last value or by pre-aggregating metrics:
 *
 * - When running in `aggregate` mode, it pre-calculates and stores statistical summaries (`min`, `max`, `sum`, `value_count` and `avg`)
 * for each metric field grouped by a configured time interval and their dimensions.
 * - When running in `last_value` mode, it keeps the last value for each metric in the configured interval and their dimensions.
 *
 * For example, a TSDS index that contains metrics sampled every 10 seconds can be downsampled to an hourly index.
 * All documents within an hour interval are summarized and stored as a single document in the downsample index.
 *
 * NOTE: Only indices in a time series data stream are supported.
 * Neither field nor document level security can be defined on the source index.
 * The source index must be read-only (`index.blocks.write: true`).
 */
export const IndicesDownsampleRequest = z.object({
  ...RequestBase.shape,
  index: IndexName.describe('Name of the time series index to downsample.').meta({ found_in: 'path' }),
  target_index: IndexName.describe('Name of the index to create.').meta({ found_in: 'path' }),
  config: IndicesDownsampleConfig.meta({ found_in: 'body' })
}).meta({ id: 'IndicesDownsampleRequest' })
export type IndicesDownsampleRequest = z.infer<typeof IndicesDownsampleRequest>

export const IndicesDownsampleResponse = z.any().meta({ id: 'IndicesDownsampleResponse' })
export type IndicesDownsampleResponse = z.infer<typeof IndicesDownsampleResponse>
