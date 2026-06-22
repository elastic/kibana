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

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const Indices = z.union([IndexName, z.array(IndexName)]).meta({ id: 'Indices' })
export type Indices = z.infer<typeof Indices>

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const Names = z.union([Name, z.array(Name)]).meta({ id: 'Names' })
export type Names = z.infer<typeof Names>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const IndicesDeleteAliasIndicesAliasesResponseBody = z.object({
  ...AcknowledgedResponseBase.shape,
  errors: z.boolean().optional()
}).meta({ id: 'IndicesDeleteAliasIndicesAliasesResponseBody' })
export type IndicesDeleteAliasIndicesAliasesResponseBody = z.infer<typeof IndicesDeleteAliasIndicesAliasesResponseBody>

/**
 * Delete an alias.
 *
 * Removes a data stream or index from an alias.
 */
export const IndicesDeleteAliasRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('Comma-separated list of data streams or indices used to limit the request. Supports wildcards (`*`).').meta({ found_in: 'path' }),
  name: Names.describe('Comma-separated list of aliases to remove. Supports wildcards (`*`). To remove all aliases, use `*` or `_all`.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesDeleteAliasRequest' })
export type IndicesDeleteAliasRequest = z.infer<typeof IndicesDeleteAliasRequest>

export const IndicesDeleteAliasResponse = IndicesDeleteAliasIndicesAliasesResponseBody.meta({ id: 'IndicesDeleteAliasResponse' })
export type IndicesDeleteAliasResponse = z.infer<typeof IndicesDeleteAliasResponse>
