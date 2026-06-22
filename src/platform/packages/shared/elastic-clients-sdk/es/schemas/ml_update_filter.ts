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

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Update a filter.
 *
 * Updates the description of a filter, adds items, or removes items from the list.
 */
export const MlUpdateFilterRequest = z.object({
  ...RequestBase.shape,
  filter_id: Id.describe('A string that uniquely identifies a filter.').meta({ found_in: 'path' }),
  add_items: z.array(z.string()).describe('The items to add to the filter.').optional().meta({ found_in: 'body' }),
  description: z.string().describe('A description for the filter.').optional().meta({ found_in: 'body' }),
  remove_items: z.array(z.string()).describe('The items to remove from the filter.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlUpdateFilterRequest' })
export type MlUpdateFilterRequest = z.infer<typeof MlUpdateFilterRequest>

export const MlUpdateFilterResponse = z.object({
  description: z.string(),
  filter_id: Id,
  items: z.array(z.string())
}).meta({ id: 'MlUpdateFilterResponse' })
export type MlUpdateFilterResponse = z.infer<typeof MlUpdateFilterResponse>
