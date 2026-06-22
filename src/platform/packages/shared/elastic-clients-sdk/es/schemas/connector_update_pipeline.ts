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

export const Result = z.enum(['created', 'updated', 'deleted', 'not_found', 'noop']).meta({ id: 'Result' })
export type Result = z.infer<typeof Result>

export const ConnectorIngestPipelineParams = z.object({
  extract_binary_content: z.boolean(),
  name: z.string(),
  reduce_whitespace: z.boolean(),
  run_ml_inference: z.boolean()
}).meta({ id: 'ConnectorIngestPipelineParams' })
export type ConnectorIngestPipelineParams = z.infer<typeof ConnectorIngestPipelineParams>

/**
 * Update the connector pipeline.
 *
 * When you create a new connector, the configuration of an ingest pipeline is populated with default settings.
 */
export const ConnectorUpdatePipelineRequest = z.object({
  ...RequestBase.shape,
  connector_id: Id.describe('The unique identifier of the connector to be updated').meta({ found_in: 'path' }),
  pipeline: ConnectorIngestPipelineParams.meta({ found_in: 'body' })
}).meta({ id: 'ConnectorUpdatePipelineRequest' })
export type ConnectorUpdatePipelineRequest = z.infer<typeof ConnectorUpdatePipelineRequest>

export const ConnectorUpdatePipelineResponse = z.object({
  result: Result
}).meta({ id: 'ConnectorUpdatePipelineResponse' })
export type ConnectorUpdatePipelineResponse = z.infer<typeof ConnectorUpdatePipelineResponse>
