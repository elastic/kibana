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

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const float = z.number().meta({ id: 'float' })
export type float = z.infer<typeof float>

/**
 * Sparse Embedding tokens are represented as a dictionary
 * of string to double.
 */
export const InferenceSparseVector = z.record(z.string(), float).meta({ id: 'InferenceSparseVector' })
export type InferenceSparseVector = z.infer<typeof InferenceSparseVector>

export const InferenceSparseEmbeddingResult = z.object({
  is_truncated: z.boolean().describe('Indicates if the text input was truncated in the request sent to the service'),
  embedding: InferenceSparseVector
}).meta({ id: 'InferenceSparseEmbeddingResult' })
export type InferenceSparseEmbeddingResult = z.infer<typeof InferenceSparseEmbeddingResult>

/** The response format for the sparse embedding request. */
export const InferenceSparseEmbeddingInferenceResult = z.object({
  sparse_embedding: z.array(InferenceSparseEmbeddingResult)
}).meta({ id: 'InferenceSparseEmbeddingInferenceResult' })
export type InferenceSparseEmbeddingInferenceResult = z.infer<typeof InferenceSparseEmbeddingInferenceResult>

export const InferenceTaskSettings = z.any().meta({ id: 'InferenceTaskSettings' })
export type InferenceTaskSettings = z.infer<typeof InferenceTaskSettings>

/** Perform sparse embedding inference on the service. */
export const InferenceSparseEmbeddingRequest = z.object({
  ...RequestBase.shape,
  inference_id: Id.describe('The inference Id').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference request to complete.').optional().meta({ found_in: 'query' }),
  input: z.union([z.string(), z.array(z.string())]).describe('Inference input. Either a string or an array of strings.').meta({ found_in: 'body' }),
  task_settings: InferenceTaskSettings.describe('Task settings for the individual inference request. These settings are specific to the <task_type> you specified and override the task settings specified when initializing the service.').optional().meta({ found_in: 'body' })
}).meta({ id: 'InferenceSparseEmbeddingRequest' })
export type InferenceSparseEmbeddingRequest = z.infer<typeof InferenceSparseEmbeddingRequest>

export const InferenceSparseEmbeddingResponse = InferenceSparseEmbeddingInferenceResult.meta({ id: 'InferenceSparseEmbeddingResponse' })
export type InferenceSparseEmbeddingResponse = z.infer<typeof InferenceSparseEmbeddingResponse>
