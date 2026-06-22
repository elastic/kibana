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

/** Path to field or array of paths. Some API's support wildcards in the path to select multiple fields. */
export const Field = z.string().meta({ id: 'Field' })
export type Field = z.infer<typeof Field>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const TimeZone = z.string().meta({ id: 'TimeZone' })
export type TimeZone = z.infer<typeof TimeZone>

/**
 * Get the rollup job capabilities.
 *
 * Get the capabilities of any rollup jobs that have been configured for a specific index or index pattern.
 *
 * This API is useful because a rollup job is often configured to rollup only a subset of fields from the source index.
 * Furthermore, only certain aggregations can be configured for various fields, leading to a limited subset of functionality depending on that configuration.
 * This API enables you to inspect an index and determine:
 *
 * 1. Does this index have associated rollup data somewhere in the cluster?
 * 2. If yes to the first question, what fields were rolled up, what aggregations can be performed, and where does the data live?
 * @deprecated
 */
export const RollupGetRollupCapsRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('Index, indices or index-pattern to return rollup capabilities for. `_all` may be used to fetch rollup capabilities from all jobs.').optional().meta({ found_in: 'path' })
}).meta({ id: 'RollupGetRollupCapsRequest' })
export type RollupGetRollupCapsRequest = z.infer<typeof RollupGetRollupCapsRequest>

export const RollupGetRollupCapsRollupFieldSummary = z.object({
  agg: z.string(),
  calendar_interval: Duration.optional(),
  time_zone: TimeZone.optional()
}).meta({ id: 'RollupGetRollupCapsRollupFieldSummary' })
export type RollupGetRollupCapsRollupFieldSummary = z.infer<typeof RollupGetRollupCapsRollupFieldSummary>

export const RollupGetRollupCapsRollupCapabilitySummary = z.object({
  fields: z.record(Field, z.array(RollupGetRollupCapsRollupFieldSummary)),
  index_pattern: z.string(),
  job_id: z.string(),
  rollup_index: z.string()
}).meta({ id: 'RollupGetRollupCapsRollupCapabilitySummary' })
export type RollupGetRollupCapsRollupCapabilitySummary = z.infer<typeof RollupGetRollupCapsRollupCapabilitySummary>

export const RollupGetRollupCapsRollupCapabilities = z.object({
  rollup_jobs: z.array(RollupGetRollupCapsRollupCapabilitySummary).describe('There can be multiple, independent jobs configured for a single index or index pattern. Each of these jobs may have different configurations, so the API returns a list of all the various configurations available.')
}).meta({ id: 'RollupGetRollupCapsRollupCapabilities' })
export type RollupGetRollupCapsRollupCapabilities = z.infer<typeof RollupGetRollupCapsRollupCapabilities>

export const RollupGetRollupCapsResponse = z.record(IndexName, RollupGetRollupCapsRollupCapabilities).meta({ id: 'RollupGetRollupCapsResponse' })
export type RollupGetRollupCapsResponse = z.infer<typeof RollupGetRollupCapsResponse>
