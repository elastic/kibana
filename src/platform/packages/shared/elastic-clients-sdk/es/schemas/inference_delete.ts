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

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/** Acknowledged response. For dry_run, contains the list of pipelines which reference the inference endpoint */
export const InferenceDeleteInferenceEndpointResult = z.object({
  ...AcknowledgedResponseBase.shape,
  pipelines: z.array(z.string())
}).meta({ id: 'InferenceDeleteInferenceEndpointResult' })
export type InferenceDeleteInferenceEndpointResult = z.infer<typeof InferenceDeleteInferenceEndpointResult>

export const InferenceTaskType = z.enum(['sparse_embedding', 'text_embedding', 'rerank', 'completion', 'chat_completion', 'embedding']).meta({ id: 'InferenceTaskType' })
export type InferenceTaskType = z.infer<typeof InferenceTaskType>

/**
 * Delete an inference endpoint.
 *
 * This API requires the manage_inference cluster privilege (the built-in `inference_admin` role grants this privilege).
 */
export const InferenceDeleteRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceTaskType.describe('The task type').optional().meta({ found_in: 'path' }),
  inference_id: Id.describe('The inference identifier.').meta({ found_in: 'path' }),
  dry_run: z.boolean().describe('When true, checks the semantic_text fields and inference processors that reference the endpoint and returns them in a list, but does not delete the endpoint.').optional().meta({ found_in: 'query' }),
  force: z.boolean().describe('When true, the inference endpoint is forcefully deleted even if it is still being used by ingest processors or semantic text fields.').optional().meta({ found_in: 'query' })
}).meta({ id: 'InferenceDeleteRequest' })
export type InferenceDeleteRequest = z.infer<typeof InferenceDeleteRequest>

export const InferenceDeleteResponse = InferenceDeleteInferenceEndpointResult.meta({ id: 'InferenceDeleteResponse' })
export type InferenceDeleteResponse = z.infer<typeof InferenceDeleteResponse>
