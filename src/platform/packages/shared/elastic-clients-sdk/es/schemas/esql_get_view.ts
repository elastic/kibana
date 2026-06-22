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

/** A non-materialized ES|QL view. */
export const EsqlESQLView = z.object({
  name: z.string().describe('The name of the ES|QL view'),
  query: z.string().describe('The ES|QL query')
}).meta({ id: 'EsqlESQLView' })
export type EsqlESQLView = z.infer<typeof EsqlESQLView>

/**
 * Get an ES|QL view.
 *
 * Returns a stored ES|QL view.
 */
export const EsqlGetViewRequest = z.object({
  ...RequestBase.shape,
  name: Id.describe('The comma-separated view names to retrieve.').optional().meta({ found_in: 'path' })
}).meta({ id: 'EsqlGetViewRequest' })
export type EsqlGetViewRequest = z.infer<typeof EsqlGetViewRequest>

export const EsqlGetViewResponse = z.object({
  views: z.array(EsqlESQLView)
}).meta({ id: 'EsqlGetViewResponse' })
export type EsqlGetViewResponse = z.infer<typeof EsqlGetViewResponse>
