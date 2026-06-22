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
 * Stop data frame analytics jobs.
 *
 * A data frame analytics job can be started and stopped multiple times
 * throughout its lifecycle.
 */
export const MlStopDataFrameAnalyticsRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('Identifier for the data frame analytics job. This identifier can contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores. It must start and end with alphanumeric characters.').meta({ found_in: 'path' }),
  allow_no_match: z.boolean().describe('Specifies what to do when the request: 1. Contains wildcard expressions and there are no data frame analytics jobs that match. 2. Contains the _all string or no identifiers and there are no matches. 3. Contains wildcard expressions and there are only partial matches. The default value is true, which returns an empty data_frame_analytics array when there are no matches and the subset of results when there are partial matches. If this parameter is false, the request returns a 404 status code when there are no matches or only partial matches.').optional().meta({ found_in: 'body' }),
  force: z.boolean().describe('If true, the data frame analytics job is stopped forcefully.').optional().meta({ found_in: 'body' }),
  timeout: Duration.describe('Controls the amount of time to wait until the data frame analytics job stops. Defaults to 20 seconds.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlStopDataFrameAnalyticsRequest' })
export type MlStopDataFrameAnalyticsRequest = z.infer<typeof MlStopDataFrameAnalyticsRequest>

export const MlStopDataFrameAnalyticsResponse = z.object({
  stopped: z.boolean()
}).meta({ id: 'MlStopDataFrameAnalyticsResponse' })
export type MlStopDataFrameAnalyticsResponse = z.infer<typeof MlStopDataFrameAnalyticsResponse>
