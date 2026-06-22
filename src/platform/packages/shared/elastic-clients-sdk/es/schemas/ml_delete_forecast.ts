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
 * Delete forecasts from a job.
 *
 * By default, forecasts are retained for 14 days. You can specify a
 * different retention period with the `expires_in` parameter in the forecast
 * jobs API. The delete forecast API enables you to delete one or more
 * forecasts before they expire.
 */
export const MlDeleteForecastRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job.').meta({ found_in: 'path' }),
  forecast_id: Id.describe('A comma-separated list of forecast identifiers. If you do not specify this optional parameter or if you specify `_all` or `*` the API deletes all forecasts from the job.').optional().meta({ found_in: 'path' }),
  allow_no_forecasts: z.boolean().describe('Specifies whether an error occurs when there are no forecasts. In particular, if this parameter is set to `false` and there are no forecasts associated with the job, attempts to delete all forecasts return an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Specifies the period of time to wait for the completion of the delete operation. When this period of time elapses, the API fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'MlDeleteForecastRequest' })
export type MlDeleteForecastRequest = z.infer<typeof MlDeleteForecastRequest>

export const MlDeleteForecastResponse = AcknowledgedResponseBase.meta({ id: 'MlDeleteForecastResponse' })
export type MlDeleteForecastResponse = z.infer<typeof MlDeleteForecastResponse>
