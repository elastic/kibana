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

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Stop rollup jobs.
 *
 * If you try to stop a job that does not exist, an exception occurs.
 * If you try to stop a job that is already stopped, nothing happens.
 *
 * Since only a stopped job can be deleted, it can be useful to block the API until the indexer has fully stopped.
 * This is accomplished with the `wait_for_completion` query parameter, and optionally a timeout. For example:
 *
 * ```
 * POST _rollup/job/sensor/_stop?wait_for_completion=true&timeout=10s
 * ```
 * The parameter blocks the API call from returning until either the job has moved to STOPPED or the specified time has elapsed.
 * If the specified time elapses without the job moving to STOPPED, a timeout exception occurs.
 * @deprecated
 */
export const RollupStopJobRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('Identifier for the rollup job.').meta({ found_in: 'path' }),
  timeout: Duration.describe('If `wait_for_completion` is `true`, the API blocks for (at maximum) the specified duration while waiting for the job to stop. If more than `timeout` time has passed, the API throws a timeout exception. NOTE: Even if a timeout occurs, the stop request is still processing and eventually moves the job to STOPPED. The timeout simply means the API call itself timed out while waiting for the status change.').optional().meta({ found_in: 'query' }),
  wait_for_completion: z.boolean().describe('If set to `true`, causes the API to block until the indexer state completely stops. If set to `false`, the API returns immediately and the indexer is stopped asynchronously in the background.').optional().meta({ found_in: 'query' })
}).meta({ id: 'RollupStopJobRequest' })
export type RollupStopJobRequest = z.infer<typeof RollupStopJobRequest>

export const RollupStopJobResponse = z.object({
  stopped: z.boolean()
}).meta({ id: 'RollupStopJobResponse' })
export type RollupStopJobResponse = z.infer<typeof RollupStopJobResponse>
