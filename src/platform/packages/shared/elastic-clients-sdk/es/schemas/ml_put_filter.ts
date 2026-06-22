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
 * Create a filter.
 *
 * A filter contains a list of strings. It can be used by one or more anomaly detection jobs.
 * Specifically, filters are referenced in the `custom_rules` property of detector configuration objects.
 */
export const MlPutFilterRequest = z.object({
  ...RequestBase.shape,
  filter_id: Id.describe('A string that uniquely identifies a filter.').meta({ found_in: 'path' }),
  description: z.string().describe('A description of the filter.').optional().meta({ found_in: 'body' }),
  items: z.array(z.string()).describe('The items of the filter. A wildcard `*` can be used at the beginning or the end of an item. Up to 10000 items are allowed in each filter.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlPutFilterRequest' })
export type MlPutFilterRequest = z.infer<typeof MlPutFilterRequest>

export const MlPutFilterResponse = z.object({
  description: z.string(),
  filter_id: Id,
  items: z.array(z.string())
}).meta({ id: 'MlPutFilterResponse' })
export type MlPutFilterResponse = z.infer<typeof MlPutFilterResponse>
