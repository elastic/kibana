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

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const ScrollId = z.string().meta({ id: 'ScrollId' })
export type ScrollId = z.infer<typeof ScrollId>

export const ScrollIds = z.union([ScrollId, z.array(ScrollId)]).meta({ id: 'ScrollIds' })
export type ScrollIds = z.infer<typeof ScrollIds>

/**
 * Clear a scrolling search.
 *
 * Clear the search context and results for a scrolling search.
 */
export const ClearScrollRequest = z.object({
  ...RequestBase.shape,
  scroll_id: ScrollIds.describe('The scroll IDs to clear. To clear all scroll IDs, use `_all`.').optional().meta({ found_in: 'body' })
}).meta({ id: 'ClearScrollRequest' })
export type ClearScrollRequest = z.infer<typeof ClearScrollRequest>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const ClearScrollResponse = z.object({
  succeeded: z.boolean().describe('If `true`, the request succeeded. This does not indicate whether any scrolling search requests were cleared.'),
  num_freed: integer.describe('The number of scrolling search requests cleared.')
}).meta({ id: 'ClearScrollResponse' })
export type ClearScrollResponse = z.infer<typeof ClearScrollResponse>
