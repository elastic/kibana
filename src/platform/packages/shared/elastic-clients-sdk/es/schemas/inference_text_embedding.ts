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

export const byte = z.number().meta({ id: 'byte' })
export type byte = z.infer<typeof byte>

export const float = z.number().meta({ id: 'float' })
export type float = z.infer<typeof float>

/**
 * Dense Embedding results containing bytes are represented as Dense
 * Vectors of bytes.
 */
export const InferenceDenseByteVector = z.array(byte).meta({ id: 'InferenceDenseByteVector' })
export type InferenceDenseByteVector = z.infer<typeof InferenceDenseByteVector>

/** The dense embedding result object for byte representation */
export const InferenceDenseEmbeddingByteResult = z.object({
  embedding: InferenceDenseByteVector
}).meta({ id: 'InferenceDenseEmbeddingByteResult' })
export type InferenceDenseEmbeddingByteResult = z.infer<typeof InferenceDenseEmbeddingByteResult>

/**
 * Dense Embedding results are represented as Dense Vectors
 * of floats.
 */
export const InferenceDenseVector = z.array(float).meta({ id: 'InferenceDenseVector' })
export type InferenceDenseVector = z.infer<typeof InferenceDenseVector>

/** The dense embedding result object for float representation */
export const InferenceDenseEmbeddingResult = z.object({
  embedding: InferenceDenseVector
}).meta({ id: 'InferenceDenseEmbeddingResult' })
export type InferenceDenseEmbeddingResult = z.infer<typeof InferenceDenseEmbeddingResult>

export const InferenceTaskSettings = z.any().meta({ id: 'InferenceTaskSettings' })
export type InferenceTaskSettings = z.infer<typeof InferenceTaskSettings>

const InferenceTextEmbeddingInferenceResultExclusiveProps = z.union([z.object({ text_embedding_bytes: z.array(InferenceDenseEmbeddingByteResult) }), z.object({ text_embedding_bits: z.array(InferenceDenseEmbeddingByteResult) }), z.object({ text_embedding: z.array(InferenceDenseEmbeddingResult) })])

/** TextEmbeddingInferenceResult is an aggregation of mutually exclusive text_embedding variants */
export const InferenceTextEmbeddingInferenceResult = InferenceTextEmbeddingInferenceResultExclusiveProps.meta({ id: 'InferenceTextEmbeddingInferenceResult' })
export type InferenceTextEmbeddingInferenceResult = z.infer<typeof InferenceTextEmbeddingInferenceResult>

/** Perform text embedding inference on the service. */
export const InferenceTextEmbeddingRequest = z.object({
  ...RequestBase.shape,
  inference_id: Id.describe('The inference Id').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference request to complete.').optional().meta({ found_in: 'query' }),
  input: z.union([z.string(), z.array(z.string())]).describe('Inference input. Either a string or an array of strings.').meta({ found_in: 'body' }),
  input_type: z.string().describe('The input data type for the text embedding model. Possible values include: * `SEARCH` * `INGEST` * `CLASSIFICATION` * `CLUSTERING` Not all services support all values. Unsupported values will trigger a validation exception. Accepted values depend on the configured inference service, refer to the relevant service-specific documentation for more info. > info > The `input_type` parameter specified on the root level of the request body will take precedence over the `input_type` parameter specified in `task_settings`.').optional().meta({ found_in: 'body' }),
  task_settings: InferenceTaskSettings.describe('Task settings for the individual inference request. These settings are specific to the <task_type> you specified and override the task settings specified when initializing the service.').optional().meta({ found_in: 'body' })
}).meta({ id: 'InferenceTextEmbeddingRequest' })
export type InferenceTextEmbeddingRequest = z.infer<typeof InferenceTextEmbeddingRequest>

export const InferenceTextEmbeddingResponse = InferenceTextEmbeddingInferenceResult.meta({ id: 'InferenceTextEmbeddingResponse' })
export type InferenceTextEmbeddingResponse = z.infer<typeof InferenceTextEmbeddingResponse>
