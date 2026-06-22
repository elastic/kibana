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

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const Names = z.union([Name, z.array(Name)]).meta({ id: 'Names' })
export type Names = z.infer<typeof Names>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Delete an index template.
 *
 * The provided <index-template> may contain multiple template names separated by a comma. If multiple template
 * names are specified then there is no wildcard support and the provided names should match completely with
 * existing templates.
 */
export const IndicesDeleteIndexTemplateRequest = z.object({
  ...RequestBase.shape,
  name: Names.describe('Comma-separated list of index template names used to limit the request. Wildcard (*) expressions are supported.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesDeleteIndexTemplateRequest' })
export type IndicesDeleteIndexTemplateRequest = z.infer<typeof IndicesDeleteIndexTemplateRequest>

export const IndicesDeleteIndexTemplateResponse = AcknowledgedResponseBase.meta({ id: 'IndicesDeleteIndexTemplateResponse' })
export type IndicesDeleteIndexTemplateResponse = z.infer<typeof IndicesDeleteIndexTemplateResponse>
