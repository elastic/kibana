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

export const uint = z.number().meta({ id: 'uint' })
export type uint = z.infer<typeof uint>

/**
 * Get the async SQL search status.
 *
 * Get the current status of an async SQL search or a stored synchronous SQL search.
 */
export const SqlGetAsyncStatusRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('The identifier for the search.').meta({ found_in: 'path' })
}).meta({ id: 'SqlGetAsyncStatusRequest' })
export type SqlGetAsyncStatusRequest = z.infer<typeof SqlGetAsyncStatusRequest>

export const SqlGetAsyncStatusResponse = z.object({
  expiration_time_in_millis: EpochTime.describe('The timestamp, in milliseconds since the Unix epoch, when Elasticsearch will delete the search and its results, even if the search is still running.'),
  id: z.string().describe('The identifier for the search.'),
  is_running: z.boolean().describe('If `true`, the search is still running. If `false`, the search has finished.'),
  is_partial: z.boolean().describe('If `true`, the response does not contain complete search results. If `is_partial` is `true` and `is_running` is `true`, the search is still running. If `is_partial` is `true` but `is_running` is `false`, the results are partial due to a failure or timeout.'),
  start_time_in_millis: EpochTime.describe('The timestamp, in milliseconds since the Unix epoch, when the search started. The API returns this property only for running searches.'),
  completion_status: uint.describe('The HTTP status code for the search. The API returns this property only for completed searches.').optional()
}).meta({ id: 'SqlGetAsyncStatusResponse' })
export type SqlGetAsyncStatusResponse = z.infer<typeof SqlGetAsyncStatusResponse>
