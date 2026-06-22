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
 * Predict future behavior of a time series.
 *
 * Forecasts are not supported for jobs that perform population analysis; an
 * error occurs if you try to create a forecast for a job that has an
 * `over_field_name` in its configuration. Forcasts predict future behavior
 * based on historical data.
 */
export const MlForecastRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job. The job must be open when you create a forecast; otherwise, an error occurs.').meta({ found_in: 'path' }),
  duration: Duration.describe('Refer to the description for the `duration` query parameter.').optional().meta({ found_in: 'body' }),
  expires_in: Duration.describe('Refer to the description for the `expires_in` query parameter.').optional().meta({ found_in: 'body' }),
  max_model_memory: z.string().describe('Refer to the description for the `max_model_memory` query parameter.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlForecastRequest' })
export type MlForecastRequest = z.infer<typeof MlForecastRequest>

export const MlForecastResponse = z.object({
  acknowledged: z.boolean(),
  forecast_id: Id
}).meta({ id: 'MlForecastResponse' })
export type MlForecastResponse = z.infer<typeof MlForecastResponse>
