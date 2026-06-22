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

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Render a search application query.
 *
 * Generate an Elasticsearch query using the specified query parameters and the search template associated with the search application or a default template if none is specified.
 * If a parameter used in the search template is not specified in `params`, the parameter's default value will be used.
 * The API returns the specific Elasticsearch query that would be generated and run by calling the search application search API.
 *
 * You must have `read` privileges on the backing alias of the search application.
 */
export const SearchApplicationRenderQueryRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('The name of the search application to render teh query for.').meta({ found_in: 'path' }),
  params: z.record(z.string(), z.any()).optional().meta({ found_in: 'body' })
}).meta({ id: 'SearchApplicationRenderQueryRequest' })
export type SearchApplicationRenderQueryRequest = z.infer<typeof SearchApplicationRenderQueryRequest>

export const SearchApplicationRenderQueryResponse = z.object({
}).meta({ id: 'SearchApplicationRenderQueryResponse' })
export type SearchApplicationRenderQueryResponse = z.infer<typeof SearchApplicationRenderQueryResponse>
