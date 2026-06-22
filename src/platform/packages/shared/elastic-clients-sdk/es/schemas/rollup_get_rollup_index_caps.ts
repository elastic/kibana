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

export const Ids = z.union([Id, z.array(Id)]).meta({ id: 'Ids' })
export type Ids = z.infer<typeof Ids>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const TimeZone = z.string().meta({ id: 'TimeZone' })
export type TimeZone = z.infer<typeof TimeZone>

export const RollupGetRollupIndexCapsRollupJobSummaryField = z.object({
  agg: z.string(),
  time_zone: TimeZone.optional(),
  calendar_interval: Duration.optional()
}).meta({ id: 'RollupGetRollupIndexCapsRollupJobSummaryField' })
export type RollupGetRollupIndexCapsRollupJobSummaryField = z.infer<typeof RollupGetRollupIndexCapsRollupJobSummaryField>

export const RollupGetRollupIndexCapsRollupJobSummary = z.object({
  fields: z.record(Field, z.array(RollupGetRollupIndexCapsRollupJobSummaryField)),
  index_pattern: z.string(),
  job_id: Id,
  rollup_index: IndexName
}).meta({ id: 'RollupGetRollupIndexCapsRollupJobSummary' })
export type RollupGetRollupIndexCapsRollupJobSummary = z.infer<typeof RollupGetRollupIndexCapsRollupJobSummary>

export const RollupGetRollupIndexCapsIndexCapabilities = z.object({
  rollup_jobs: z.array(RollupGetRollupIndexCapsRollupJobSummary)
}).meta({ id: 'RollupGetRollupIndexCapsIndexCapabilities' })
export type RollupGetRollupIndexCapsIndexCapabilities = z.infer<typeof RollupGetRollupIndexCapsIndexCapabilities>

/**
 * Get the rollup index capabilities.
 *
 * Get the rollup capabilities of all jobs inside of a rollup index.
 * A single rollup index may store the data for multiple rollup jobs and may have a variety of capabilities depending on those jobs. This API enables you to determine:
 *
 * * What jobs are stored in an index (or indices specified via a pattern)?
 * * What target indices were rolled up, what fields were used in those rollups, and what aggregations can be performed on each job?
 * @deprecated
 */
export const RollupGetRollupIndexCapsRequest = z.object({
  ...RequestBase.shape,
  index: Ids.describe('Data stream or index to check for rollup capabilities. Wildcard (`*`) expressions are supported.').meta({ found_in: 'path' })
}).meta({ id: 'RollupGetRollupIndexCapsRequest' })
export type RollupGetRollupIndexCapsRequest = z.infer<typeof RollupGetRollupIndexCapsRequest>

export const RollupGetRollupIndexCapsResponse = z.record(IndexName, RollupGetRollupIndexCapsIndexCapabilities).meta({ id: 'RollupGetRollupIndexCapsResponse' })
export type RollupGetRollupIndexCapsResponse = z.infer<typeof RollupGetRollupIndexCapsResponse>
