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
 * Stop datafeeds.
 *
 * A datafeed that is stopped ceases to retrieve data from Elasticsearch. A datafeed can be started and stopped
 * multiple times throughout its lifecycle.
 */
export const MlStopDatafeedRequest = z.object({
  ...RequestBase.shape,
  datafeed_id: Id.describe('Identifier for the datafeed. You can stop multiple datafeeds in a single API request by using a comma-separated list of datafeeds or a wildcard expression. You can close all datafeeds by using `_all` or by specifying `*` as the identifier.').meta({ found_in: 'path' }),
  allow_no_match: z.boolean().describe('Refer to the description for the `allow_no_match` query parameter.').optional().meta({ found_in: 'body' }),
  force: z.boolean().describe('Refer to the description for the `force` query parameter.').optional().meta({ found_in: 'body' }),
  timeout: Duration.describe('Refer to the description for the `timeout` query parameter.').optional().meta({ found_in: 'body' }),
  close_job: z.boolean().describe('Refer to the description for the `close_job` query parameter.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlStopDatafeedRequest' })
export type MlStopDatafeedRequest = z.infer<typeof MlStopDatafeedRequest>

export const MlStopDatafeedResponse = z.object({
  stopped: z.boolean()
}).meta({ id: 'MlStopDatafeedResponse' })
export type MlStopDatafeedResponse = z.infer<typeof MlStopDatafeedResponse>
