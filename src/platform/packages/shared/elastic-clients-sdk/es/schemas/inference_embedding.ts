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

export const InferenceEmbeddingContentFormat = z.enum(['text', 'base64']).meta({ id: 'InferenceEmbeddingContentFormat' })
export type InferenceEmbeddingContentFormat = z.infer<typeof InferenceEmbeddingContentFormat>

export const InferenceEmbeddingContentType = z.enum(['text', 'image']).meta({ id: 'InferenceEmbeddingContentType' })
export type InferenceEmbeddingContentType = z.infer<typeof InferenceEmbeddingContentType>

/** An object containing the input data for the model to embed. */
export const InferenceEmbeddingContentObjectContents = z.object({
  type: InferenceEmbeddingContentType.describe('The type of input to embed.'),
  format: InferenceEmbeddingContentFormat.describe('The format of the input. For the `text` type this must be `text`. For the `image` type, this must be `base64`. If not specified, this will default to `text` for the `text` type and `base64` for the `image` type.').optional(),
  value: z.string().describe('The value of the input to embed. For images, this must be a base64-encoded data URI, i.e. "data:content/type;base64,..."')
}).meta({ id: 'InferenceEmbeddingContentObjectContents' })
export type InferenceEmbeddingContentObjectContents = z.infer<typeof InferenceEmbeddingContentObjectContents>

/** A wrapper object which contains the fields required to specify multimodal inputs */
export const InferenceEmbeddingContentObject = z.object({
  content: InferenceEmbeddingContentObjectContents.describe('An object containing the input data for the model to embed')
}).meta({ id: 'InferenceEmbeddingContentObject' })
export type InferenceEmbeddingContentObject = z.infer<typeof InferenceEmbeddingContentObject>

/** Allows specifying multimodal inputs for the `embedding` task. */
export const InferenceEmbeddingContentInput = z.union([InferenceEmbeddingContentObject, z.array(InferenceEmbeddingContentObject)]).meta({ id: 'InferenceEmbeddingContentInput' })
export type InferenceEmbeddingContentInput = z.infer<typeof InferenceEmbeddingContentInput>

const InferenceEmbeddingInferenceResultExclusiveProps = z.union([z.object({ embeddings_bytes: z.array(InferenceDenseEmbeddingByteResult) }), z.object({ embeddings_bits: z.array(InferenceDenseEmbeddingByteResult) }), z.object({ embeddings: z.array(InferenceDenseEmbeddingResult) })])

/** EmbeddingInferenceResult is an aggregation of mutually exclusive embeddings variants */
export const InferenceEmbeddingInferenceResult = InferenceEmbeddingInferenceResultExclusiveProps.meta({ id: 'InferenceEmbeddingInferenceResult' })
export type InferenceEmbeddingInferenceResult = z.infer<typeof InferenceEmbeddingInferenceResult>

/** Allows specifying text-only inputs for the `embedding` task. */
export const InferenceEmbeddingStringInput = z.union([z.string(), z.array(z.string())]).meta({ id: 'InferenceEmbeddingStringInput' })
export type InferenceEmbeddingStringInput = z.infer<typeof InferenceEmbeddingStringInput>

/**
 * Inference input.
 * Either a string, an array of strings, a `content` object, or an array of `content` objects.
 */
export const InferenceEmbeddingInput = z.union([InferenceEmbeddingStringInput, InferenceEmbeddingContentInput]).meta({ id: 'InferenceEmbeddingInput' })
export type InferenceEmbeddingInput = z.infer<typeof InferenceEmbeddingInput>

export const InferenceTaskSettings = z.any().meta({ id: 'InferenceTaskSettings' })
export type InferenceTaskSettings = z.infer<typeof InferenceTaskSettings>

export const InferenceRequestEmbedding = z.object({
  input: InferenceEmbeddingInput.describe('Inference input. Either a string, an array of strings, a `content` object, or an array of `content` objects. string example: ``` "input": "Some text" ``` string array example: ``` "input": ["Some text", "Some more text"] ``` `content` object example: ``` "input": {     "content": {       "type": "image",       "format": "base64",       "value": "data:image/jpeg;base64,..."     }   } ``` `content` object array example: ``` "input": [   {     "content": {       "type": "text",       "format": "text",       "value": "Some text to generate an embedding"     }   },   {     "content": {       "type": "image",       "format": "base64",       "value": "data:image/jpeg;base64,..."     }   } ] ```'),
  input_type: z.string().describe('The input data type for the embedding model. Possible values include: * `SEARCH` * `INGEST` * `CLASSIFICATION` * `CLUSTERING` Not all models support all values. Unsupported values will trigger a validation exception. Accepted values depend on the configured inference service, refer to the relevant service-specific documentation for more info. > info > The `input_type` parameter specified on the root level of the request body will take precedence over the `input_type` parameter specified in `task_settings`.').optional(),
  task_settings: InferenceTaskSettings.describe('Task settings for the individual inference request. These settings are specific to the <task_type> you specified and override the task settings specified when initializing the service.').optional()
}).meta({ id: 'InferenceRequestEmbedding' })
export type InferenceRequestEmbedding = z.infer<typeof InferenceRequestEmbedding>

/** Perform dense embedding inference on the service. */
export const InferenceEmbeddingRequest = z.object({
  ...RequestBase.shape,
  inference_id: Id.describe('The inference Id').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference request to complete.').optional().meta({ found_in: 'query' }),
  embedding: InferenceRequestEmbedding.meta({ found_in: 'body' })
}).meta({ id: 'InferenceEmbeddingRequest' })
export type InferenceEmbeddingRequest = z.infer<typeof InferenceEmbeddingRequest>

export const InferenceEmbeddingResponse = InferenceEmbeddingInferenceResult.meta({ id: 'InferenceEmbeddingResponse' })
export type InferenceEmbeddingResponse = z.infer<typeof InferenceEmbeddingResponse>
