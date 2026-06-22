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

export const HealthStatus = z.enum(['green', 'GREEN', 'yellow', 'YELLOW', 'red', 'RED', 'unknown', 'unavailable']).meta({ id: 'HealthStatus' })
export type HealthStatus = z.infer<typeof HealthStatus>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const Names = z.union([Name, z.array(Name)]).meta({ id: 'Names' })
export type Names = z.infer<typeof Names>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const double = z.number().meta({ id: 'double' })
export type double = z.infer<typeof double>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const TransformGetTransformStatsTransformProgress = z.object({
  docs_indexed: long,
  docs_processed: long,
  docs_remaining: long.optional(),
  percent_complete: double.optional(),
  total_docs: long.optional()
}).meta({ id: 'TransformGetTransformStatsTransformProgress' })
export type TransformGetTransformStatsTransformProgress = z.infer<typeof TransformGetTransformStatsTransformProgress>

export const TransformGetTransformStatsCheckpointStats = z.object({
  checkpoint: long,
  checkpoint_progress: TransformGetTransformStatsTransformProgress.optional(),
  timestamp: DateTime.optional(),
  timestamp_millis: EpochTime.optional(),
  time_upper_bound: DateTime.optional(),
  time_upper_bound_millis: EpochTime.optional()
}).meta({ id: 'TransformGetTransformStatsCheckpointStats' })
export type TransformGetTransformStatsCheckpointStats = z.infer<typeof TransformGetTransformStatsCheckpointStats>

export const TransformGetTransformStatsCheckpointing = z.object({
  changes_last_detected_at: long.optional(),
  changes_last_detected_at_string: DateTime.optional(),
  last: TransformGetTransformStatsCheckpointStats,
  next: TransformGetTransformStatsCheckpointStats.optional(),
  operations_behind: long.optional(),
  last_search_time: long.optional(),
  last_search_time_string: DateTime.optional()
}).meta({ id: 'TransformGetTransformStatsCheckpointing' })
export type TransformGetTransformStatsCheckpointing = z.infer<typeof TransformGetTransformStatsCheckpointing>

/**
 * Get transform stats.
 *
 * Get usage information for transforms.
 */
export const TransformGetTransformStatsRequest = z.object({
  ...RequestBase.shape,
  transform_id: Names.describe('Identifier for the transform. It can be a transform identifier or a wildcard expression. You can get information for all transforms by using `_all`, by specifying `*` as the `<transform_id>`, or by omitting the `<transform_id>`.').meta({ found_in: 'path' }),
  allow_no_match: z.boolean().describe('Specifies what to do when the request: 1. Contains wildcard expressions and there are no transforms that match. 2. Contains the _all string or no identifiers and there are no matches. 3. Contains wildcard expressions and there are only partial matches. If this parameter is false, the request returns a 404 status code when there are no matches or only partial matches.').optional().meta({ found_in: 'query' }),
  from: long.describe('Skips the specified number of transforms.').optional().meta({ found_in: 'query' }),
  size: long.describe('Specifies the maximum number of transforms to obtain.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Controls the time to wait for the stats').optional().meta({ found_in: 'query' })
}).meta({ id: 'TransformGetTransformStatsRequest' })
export type TransformGetTransformStatsRequest = z.infer<typeof TransformGetTransformStatsRequest>

export const TransformGetTransformStatsTransformHealthIssue = z.object({
  type: z.string().describe('The type of the issue'),
  issue: z.string().describe('A description of the issue'),
  details: z.string().describe('Details about the issue').optional(),
  count: integer.describe('Number of times this issue has occurred since it started'),
  first_occurrence: EpochTime.describe('The timestamp this issue occurred for for the first time').optional(),
  first_occurence_string: DateTime.optional()
}).meta({ id: 'TransformGetTransformStatsTransformHealthIssue' })
export type TransformGetTransformStatsTransformHealthIssue = z.infer<typeof TransformGetTransformStatsTransformHealthIssue>

export const TransformGetTransformStatsTransformStatsHealth = z.object({
  status: HealthStatus,
  issues: z.array(TransformGetTransformStatsTransformHealthIssue).describe('If a non-healthy status is returned, contains a list of issues of the transform.').optional()
}).meta({ id: 'TransformGetTransformStatsTransformStatsHealth' })
export type TransformGetTransformStatsTransformStatsHealth = z.infer<typeof TransformGetTransformStatsTransformStatsHealth>

export const TransformGetTransformStatsTransformIndexerStats = z.object({
  delete_time_in_ms: EpochTime.optional(),
  documents_indexed: long,
  documents_deleted: long.optional(),
  documents_processed: long,
  exponential_avg_checkpoint_duration_ms: DurationValue,
  exponential_avg_documents_indexed: double,
  exponential_avg_documents_processed: double,
  index_failures: long,
  index_time_in_ms: DurationValue,
  index_total: long,
  pages_processed: long,
  processing_time_in_ms: DurationValue,
  processing_total: long,
  search_failures: long,
  search_time_in_ms: DurationValue,
  search_total: long,
  trigger_count: long
}).meta({ id: 'TransformGetTransformStatsTransformIndexerStats' })
export type TransformGetTransformStatsTransformIndexerStats = z.infer<typeof TransformGetTransformStatsTransformIndexerStats>

export const TransformGetTransformStatsTransformStats = z.object({
  checkpointing: TransformGetTransformStatsCheckpointing,
  health: TransformGetTransformStatsTransformStatsHealth.optional(),
  id: Id,
  reason: z.string().optional(),
  state: z.string(),
  stats: TransformGetTransformStatsTransformIndexerStats
}).meta({ id: 'TransformGetTransformStatsTransformStats' })
export type TransformGetTransformStatsTransformStats = z.infer<typeof TransformGetTransformStatsTransformStats>

export const TransformGetTransformStatsResponse = z.object({
  count: long,
  transforms: z.array(TransformGetTransformStatsTransformStats)
}).meta({ id: 'TransformGetTransformStatsResponse' })
export type TransformGetTransformStatsResponse = z.infer<typeof TransformGetTransformStatsResponse>
