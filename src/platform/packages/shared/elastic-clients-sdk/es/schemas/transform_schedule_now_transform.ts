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
 * Schedule a transform to start now.
 *
 * Instantly run a transform to process data.
 * If you run this API, the transform will process the new data instantly,
 * without waiting for the configured frequency interval. After the API is called,
 * the transform will be processed again at `now + frequency` unless the API
 * is called again in the meantime.
 */
export const TransformScheduleNowTransformRequest = z.object({
  ...RequestBase.shape,
  transform_id: Id.describe('Identifier for the transform.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Controls the time to wait for the scheduling to take place').optional().meta({ found_in: 'query' }),
  defer: z.boolean().describe('When true, defers the scheduling by the transform\'s configured sync delay instead of triggering immediately. The transform will process new data after the delay elapses rather than right away.').optional().meta({ found_in: 'query' })
}).meta({ id: 'TransformScheduleNowTransformRequest' })
export type TransformScheduleNowTransformRequest = z.infer<typeof TransformScheduleNowTransformRequest>

export const TransformScheduleNowTransformResponse = AcknowledgedResponseBase.meta({ id: 'TransformScheduleNowTransformResponse' })
export type TransformScheduleNowTransformResponse = z.infer<typeof TransformScheduleNowTransformResponse>
