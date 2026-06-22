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

export const IndexName = z.string().meta({ id: 'IndexName' })
export type IndexName = z.infer<typeof IndexName>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const Result = z.enum(['created', 'updated', 'deleted', 'not_found', 'noop']).meta({ id: 'Result' })
export type Result = z.infer<typeof Result>

/** Create or update a connector. */
export const ConnectorPutRequest = z.object({
  ...RequestBase.shape,
  connector_id: Id.describe('The unique identifier of the connector to be created or updated. ID is auto-generated if not provided.').optional().meta({ found_in: 'path' }),
  description: z.string().optional().meta({ found_in: 'body' }),
  index_name: IndexName.optional().meta({ found_in: 'body' }),
  is_native: z.boolean().optional().meta({ found_in: 'body' }),
  language: z.string().optional().meta({ found_in: 'body' }),
  name: z.string().optional().meta({ found_in: 'body' }),
  service_type: z.string().optional().meta({ found_in: 'body' })
}).meta({ id: 'ConnectorPutRequest' })
export type ConnectorPutRequest = z.infer<typeof ConnectorPutRequest>

export const ConnectorPutResponse = z.object({
  result: Result,
  id: Id
}).meta({ id: 'ConnectorPutResponse' })
export type ConnectorPutResponse = z.infer<typeof ConnectorPutResponse>
