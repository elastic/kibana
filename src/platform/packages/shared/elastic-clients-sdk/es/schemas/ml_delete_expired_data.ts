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

export const float = z.number().meta({ id: 'float' })
export type float = z.infer<typeof float>

/**
 * Delete expired ML data.
 *
 * Delete all job results, model snapshots and forecast data that have exceeded
 * their retention days period. Machine learning state documents that are not
 * associated with any job are also deleted.
 * You can limit the request to a single or set of anomaly detection jobs by
 * using a job identifier, a group name, a comma-separated list of jobs, or a
 * wildcard expression. You can delete expired data for all anomaly detection
 * jobs by using `_all`, by specifying `*` as the `<job_id>`, or by omitting the
 * `<job_id>`.
 */
export const MlDeleteExpiredDataRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for an anomaly detection job. It can be a job identifier, a group name, or a wildcard expression.').optional().meta({ found_in: 'path' }),
  requests_per_second: float.describe('The desired requests per second for the deletion processes. The default behavior is no throttling.').optional().meta({ found_in: 'body' }),
  timeout: Duration.describe('How long can the underlying delete processes run until they are canceled.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlDeleteExpiredDataRequest' })
export type MlDeleteExpiredDataRequest = z.infer<typeof MlDeleteExpiredDataRequest>

export const MlDeleteExpiredDataResponse = z.object({
  deleted: z.boolean()
}).meta({ id: 'MlDeleteExpiredDataResponse' })
export type MlDeleteExpiredDataResponse = z.infer<typeof MlDeleteExpiredDataResponse>
