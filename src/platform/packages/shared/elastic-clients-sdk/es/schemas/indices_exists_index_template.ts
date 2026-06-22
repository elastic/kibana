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

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Check index templates.
 *
 * Check whether index templates exist.
 */
export const IndicesExistsIndexTemplateRequest = z.object({
  ...RequestBase.shape,
  name: Name.describe('Comma-separated list of index template names used to limit the request. Wildcard (*) expressions are supported.').meta({ found_in: 'path' }),
  local: z.boolean().describe('If true, the request retrieves information from the local node only. Defaults to false, which means information is retrieved from the master node.').optional().meta({ found_in: 'query' }),
  flat_settings: z.boolean().describe('If true, returns settings in flat format.').optional().meta({ found_in: 'query' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IndicesExistsIndexTemplateRequest' })
export type IndicesExistsIndexTemplateRequest = z.infer<typeof IndicesExistsIndexTemplateRequest>

export const IndicesExistsIndexTemplateResponse = z.boolean().meta({ id: 'IndicesExistsIndexTemplateResponse' })
export type IndicesExistsIndexTemplateResponse = z.infer<typeof IndicesExistsIndexTemplateResponse>
