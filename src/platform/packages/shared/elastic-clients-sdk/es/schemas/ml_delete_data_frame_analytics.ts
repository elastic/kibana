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

/** Delete a data frame analytics job. */
export const MlDeleteDataFrameAnalyticsRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('Identifier for the data frame analytics job.').meta({ found_in: 'path' }),
  force: z.boolean().describe('If `true`, it deletes a job that is not stopped; this method is quicker than stopping and deleting the job.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The time to wait for the job to be deleted.').optional().meta({ found_in: 'query' })
}).meta({ id: 'MlDeleteDataFrameAnalyticsRequest' })
export type MlDeleteDataFrameAnalyticsRequest = z.infer<typeof MlDeleteDataFrameAnalyticsRequest>

export const MlDeleteDataFrameAnalyticsResponse = AcknowledgedResponseBase.meta({ id: 'MlDeleteDataFrameAnalyticsResponse' })
export type MlDeleteDataFrameAnalyticsResponse = z.infer<typeof MlDeleteDataFrameAnalyticsResponse>
