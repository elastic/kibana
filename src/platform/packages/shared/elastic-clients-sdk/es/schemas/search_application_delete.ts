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

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Delete a search application.
 *
 * Remove a search application and its associated alias. Indices attached to the search application are not removed.
 */
export const SearchApplicationDeleteRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('The name of the search application to delete.').meta({ found_in: 'path' })
}).meta({ id: 'SearchApplicationDeleteRequest' })
export type SearchApplicationDeleteRequest = z.infer<typeof SearchApplicationDeleteRequest>

export const SearchApplicationDeleteResponse = AcknowledgedResponseBase.meta({ id: 'SearchApplicationDeleteResponse' })
export type SearchApplicationDeleteResponse = z.infer<typeof SearchApplicationDeleteResponse>
