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
 * Check existence of index templates.
 *
 * Get information about whether index templates exist.
 * Index templates define settings, mappings, and aliases that can be applied automatically to new indices.
 *
 * IMPORTANT: This documentation is about legacy index templates, which are deprecated and will be replaced by the composable templates introduced in Elasticsearch 7.8.
 */
export const IndicesExistsTemplateRequest = z.object({
  ...RequestBase.shape,
  name: Names.describe('A comma-separated list of index template names used to limit the request. Wildcard (`*`) expressions are supported.').meta({ found_in: 'path' }),
  flat_settings: z.boolean().describe('Indicates whether to use a flat format for the response.').optional().meta({ found_in: 'query' }),
  local: z.boolean().describe('Indicates whether to get information from the local node only.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('The period to wait for the master node. If the master node is not available before the timeout expires, the request fails and returns an error. To indicate that the request should never timeout, set it to `-1`.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesExistsTemplateRequest' })
export type IndicesExistsTemplateRequest = z.infer<typeof IndicesExistsTemplateRequest>

export const IndicesExistsTemplateResponse = z.boolean().meta({ id: 'IndicesExistsTemplateResponse' })
export type IndicesExistsTemplateResponse = z.infer<typeof IndicesExistsTemplateResponse>
