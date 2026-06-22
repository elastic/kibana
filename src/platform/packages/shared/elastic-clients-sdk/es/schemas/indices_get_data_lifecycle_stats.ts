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

export const DataStreamName = z.string().meta({ id: 'DataStreamName' })
export type DataStreamName = z.infer<typeof DataStreamName>

export const DurationValue = z.any().meta({ id: 'DurationValue' })
export type DurationValue = z.infer<typeof DurationValue>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const IndicesGetDataLifecycleStatsDataStreamStats = z.object({
  backing_indices_in_error: integer.describe('The count of the backing indices for the data stream.'),
  backing_indices_in_total: integer.describe('The count of the backing indices for the data stream that have encountered an error.'),
  name: DataStreamName.describe('The name of the data stream.')
}).meta({ id: 'IndicesGetDataLifecycleStatsDataStreamStats' })
export type IndicesGetDataLifecycleStatsDataStreamStats = z.infer<typeof IndicesGetDataLifecycleStatsDataStreamStats>

/**
 * Get data stream lifecycle stats.
 *
 * Get statistics about the data streams that are managed by a data stream lifecycle.
 */
export const IndicesGetDataLifecycleStatsRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'IndicesGetDataLifecycleStatsRequest' })
export type IndicesGetDataLifecycleStatsRequest = z.infer<typeof IndicesGetDataLifecycleStatsRequest>

export const IndicesGetDataLifecycleStatsResponse = z.object({
  data_stream_count: integer.describe('The count of data streams currently being managed by the data stream lifecycle.'),
  data_streams: z.array(IndicesGetDataLifecycleStatsDataStreamStats).describe('Information about the data streams that are managed by the data stream lifecycle.'),
  last_run_duration_in_millis: DurationValue.describe('The duration of the last data stream lifecycle execution.').optional(),
  time_between_starts_in_millis: DurationValue.describe('The time that passed between the start of the last two data stream lifecycle executions. This value should amount approximately to `data_streams.lifecycle.poll_interval`.').optional()
}).meta({ id: 'IndicesGetDataLifecycleStatsResponse' })
export type IndicesGetDataLifecycleStatsResponse = z.infer<typeof IndicesGetDataLifecycleStatsResponse>
