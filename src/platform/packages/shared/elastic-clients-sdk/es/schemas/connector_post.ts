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

/**
 * Create a connector.
 *
 * Connectors are Elasticsearch integrations that bring content from third-party data sources, which can be deployed on Elastic Cloud or hosted on your own infrastructure.
 * Elastic managed connectors (Native connectors) are a managed service on Elastic Cloud.
 * Self-managed connectors (Connector clients) are self-managed on your infrastructure.
 */
export const ConnectorPostRequest = z.object({
  ...RequestBase.shape,
  description: z.string().optional().meta({ found_in: 'body' }),
  index_name: IndexName.optional().meta({ found_in: 'body' }),
  is_native: z.boolean().optional().meta({ found_in: 'body' }),
  language: z.string().optional().meta({ found_in: 'body' }),
  name: z.string().optional().meta({ found_in: 'body' }),
  service_type: z.string().optional().meta({ found_in: 'body' })
}).meta({ id: 'ConnectorPostRequest' })
export type ConnectorPostRequest = z.infer<typeof ConnectorPostRequest>

export const ConnectorPostResponse = z.object({
  result: Result,
  id: Id
}).meta({ id: 'ConnectorPostResponse' })
export type ConnectorPostResponse = z.infer<typeof ConnectorPostResponse>
