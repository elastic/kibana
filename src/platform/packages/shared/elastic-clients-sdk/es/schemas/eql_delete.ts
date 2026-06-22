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

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Delete an async EQL search.
 *
 * Delete an async EQL search or a stored synchronous EQL search.
 * The API also deletes results for the search.
 */
export const EqlDeleteRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('Identifier for the search to delete. A search ID is provided in the EQL search API\'s response for an async search. A search ID is also provided if the request’s `keep_on_completion` parameter is `true`.').meta({ found_in: 'path' })
}).meta({ id: 'EqlDeleteRequest' })
export type EqlDeleteRequest = z.infer<typeof EqlDeleteRequest>

export const EqlDeleteResponse = AcknowledgedResponseBase.meta({ id: 'EqlDeleteResponse' })
export type EqlDeleteResponse = z.infer<typeof EqlDeleteResponse>
