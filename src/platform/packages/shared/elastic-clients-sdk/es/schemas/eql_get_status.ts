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

export const EpochTime = z.any().meta({ id: 'EpochTime' })
export type EpochTime = z.infer<typeof EpochTime>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

/**
 * Get the async EQL status.
 *
 * Get the current status for an async EQL search or a stored synchronous EQL search without returning results.
 */
export const EqlGetStatusRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('Identifier for the search.').meta({ found_in: 'path' })
}).meta({ id: 'EqlGetStatusRequest' })
export type EqlGetStatusRequest = z.infer<typeof EqlGetStatusRequest>

export const EqlGetStatusResponse = z.object({
  id: Id.describe('Identifier for the search.'),
  is_partial: z.boolean().describe('If true, the search request is still executing. If false, the search is completed.'),
  is_running: z.boolean().describe('If true, the response does not contain complete search results. This could be because either the search is still running (is_running status is false), or because it is already completed (is_running status is true) and results are partial due to failures or timeouts.'),
  start_time_in_millis: EpochTime.describe('For a running search shows a timestamp when the eql search started, in milliseconds since the Unix epoch.').optional(),
  expiration_time_in_millis: EpochTime.describe('Shows a timestamp when the eql search will be expired, in milliseconds since the Unix epoch. When this time is reached, the search and its results are deleted, even if the search is still ongoing.').optional(),
  completion_status: integer.describe('For a completed search shows the http status code of the completed search.').optional()
}).meta({ id: 'EqlGetStatusResponse' })
export type EqlGetStatusResponse = z.infer<typeof EqlGetStatusResponse>
