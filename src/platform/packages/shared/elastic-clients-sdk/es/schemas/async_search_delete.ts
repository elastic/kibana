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
 * Delete an async search.
 *
 * If the asynchronous search is still running, it is cancelled.
 * Otherwise, the saved search results are deleted.
 * If the Elasticsearch security features are enabled, the deletion of a specific async search is restricted to: the authenticated user that submitted the original search request; users that have the `cancel_task` cluster privilege.
 */
export const AsyncSearchDeleteRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('A unique identifier for the async search.').meta({ found_in: 'path' })
}).meta({ id: 'AsyncSearchDeleteRequest' })
export type AsyncSearchDeleteRequest = z.infer<typeof AsyncSearchDeleteRequest>

export const AsyncSearchDeleteResponse = AcknowledgedResponseBase.meta({ id: 'AsyncSearchDeleteResponse' })
export type AsyncSearchDeleteResponse = z.infer<typeof AsyncSearchDeleteResponse>
