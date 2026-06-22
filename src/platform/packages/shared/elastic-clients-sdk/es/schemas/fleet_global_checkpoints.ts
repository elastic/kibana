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

export const IndexAlias = z.string().meta({ id: 'IndexAlias' })
export type IndexAlias = z.infer<typeof IndexAlias>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const FleetCheckpoint = long.meta({ id: 'FleetCheckpoint' })
export type FleetCheckpoint = z.infer<typeof FleetCheckpoint>

/**
 * Get global checkpoints.
 *
 * Get the current global checkpoints for an index.
 * This API is designed for internal use by the Fleet server project.
 */
export const FleetGlobalCheckpointsRequest = z.object({
  ...RequestBase.shape,
  index: z.union([IndexName, IndexAlias]).describe('A single index or index alias that resolves to a single index.').meta({ found_in: 'path' }),
  wait_for_advance: z.boolean().describe('A boolean value which controls whether to wait (until the timeout) for the global checkpoints to advance past the provided `checkpoints`.').optional().meta({ found_in: 'query' }),
  wait_for_index: z.boolean().describe('A boolean value which controls whether to wait (until the timeout) for the target index to exist and all primary shards be active. Can only be true when `wait_for_advance` is true.').optional().meta({ found_in: 'query' }),
  checkpoints: z.array(FleetCheckpoint).describe('A comma separated list of previous global checkpoints. When used in combination with `wait_for_advance`, the API will only return once the global checkpoints advances past the checkpoints. Providing an empty list will cause Elasticsearch to immediately return the current global checkpoints.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a global checkpoints to advance past `checkpoints`.').optional().meta({ found_in: 'query' })
}).meta({ id: 'FleetGlobalCheckpointsRequest' })
export type FleetGlobalCheckpointsRequest = z.infer<typeof FleetGlobalCheckpointsRequest>

export const FleetGlobalCheckpointsResponse = z.object({
  global_checkpoints: z.array(FleetCheckpoint),
  timed_out: z.boolean()
}).meta({ id: 'FleetGlobalCheckpointsResponse' })
export type FleetGlobalCheckpointsResponse = z.infer<typeof FleetGlobalCheckpointsResponse>
