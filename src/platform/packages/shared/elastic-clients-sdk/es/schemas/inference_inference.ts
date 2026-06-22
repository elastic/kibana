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

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

/** The completion result object */
export const InferenceCompletionResult = z.object({
  result: z.string()
}).meta({ id: 'InferenceCompletionResult' })
export type InferenceCompletionResult = z.infer<typeof InferenceCompletionResult>

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

/**
 * The rerank result object representing a single ranked document
 * id: the original index of the document in the request
 * relevance_score: the relevance_score of the document relative to the query
 * text: Optional, the text of the document, if requested
 */
export const InferenceRankedDocument = z.object({
  index: integer,
  relevance_score: float,
  text: z.string().optional()
}).meta({ id: 'InferenceRankedDocument' })
export type InferenceRankedDocument = z.infer<typeof InferenceRankedDocument>

const InferenceInferenceResultExclusiveProps = z.union([z.object({ embeddings_bytes: z.array(InferenceDenseEmbeddingByteResult) }), z.object({ embeddings_bits: z.array(InferenceDenseEmbeddingByteResult) }), z.object({ embeddings: z.array(InferenceDenseEmbeddingResult) }), z.object({ text_embedding_bytes: z.array(InferenceDenseEmbeddingByteResult) }), z.object({ text_embedding_bits: z.array(InferenceDenseEmbeddingByteResult) }), z.object({ text_embedding: z.array(InferenceDenseEmbeddingResult) }), z.object({ sparse_embedding: z.array(InferenceSparseEmbeddingResult) }), z.object({ completion: z.array(InferenceCompletionResult) }), z.object({ rerank: z.array(InferenceRankedDocument) })])

/** InferenceResult is an aggregation of mutually exclusive variants */
export const InferenceInferenceResult = InferenceInferenceResultExclusiveProps.meta({ id: 'InferenceInferenceResult' })
export type InferenceInferenceResult = z.infer<typeof InferenceInferenceResult>

export const InferenceTaskSettings = z.any().meta({ id: 'InferenceTaskSettings' })
export type InferenceTaskSettings = z.infer<typeof InferenceTaskSettings>

export const InferenceTaskType = z.enum(['sparse_embedding', 'text_embedding', 'rerank', 'completion', 'chat_completion', 'embedding']).meta({ id: 'InferenceTaskType' })
export type InferenceTaskType = z.infer<typeof InferenceTaskType>

/**
 * Perform inference on the service.
 *
 * This API enables you to use machine learning models to perform specific tasks on data that you provide as an input.
 * It returns a response with the results of the tasks.
 * The inference endpoint you use can perform one specific task that has been defined when the endpoint was created with the create inference API.
 *
 * For details about using this API with a service, such as Amazon Bedrock, Anthropic, or HuggingFace, refer to the service-specific documentation.
 *
 * > info
 * > The inference APIs enable you to use certain services, such as built-in machine learning models (ELSER, E5), models uploaded through Eland, Cohere, OpenAI, Azure, Google AI Studio, Google Vertex AI, Anthropic, Watsonx.ai, or Hugging Face. For built-in models and models uploaded through Eland, the inference APIs offer an alternative way to use and manage trained models. However, if you do not plan to use the inference APIs to use these models or if you want to use non-NLP models, use the machine learning trained model APIs.
 */
export const InferenceInferenceRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceTaskType.describe('The type of inference task that the model performs.').optional().meta({ found_in: 'path' }),
  inference_id: Id.describe('The unique identifier for the inference endpoint.').meta({ found_in: 'path' }),
  timeout: Duration.describe('The amount of time to wait for the inference request to complete.').optional().meta({ found_in: 'query' }),
  query: z.string().describe('The query input, which is required only for the `rerank` task. It is not required for other tasks.').optional().meta({ found_in: 'body' }),
  input: z.union([z.string(), z.array(z.string())]).describe('The text on which you want to perform the inference task. It can be a single string or an array. > info > Inference endpoints for the `completion` task type currently only support a single string as input.').meta({ found_in: 'body' }),
  input_type: z.string().describe('Specifies the input data type for the embedding model. The `input_type` parameter only applies to Inference Endpoints with the `embedding` or `text_embedding` task type. Possible values include: * `SEARCH` * `INGEST` * `CLASSIFICATION` * `CLUSTERING` Not all services support all values. Unsupported values will trigger a validation exception. Accepted values depend on the configured inference service, refer to the relevant service-specific documentation for more info. > info > The `input_type` parameter specified on the root level of the request body will take precedence over the `input_type` parameter specified in `task_settings`.').optional().meta({ found_in: 'body' }),
  task_settings: InferenceTaskSettings.describe('Task settings for the individual inference request. These settings are specific to the task type you specified and override the task settings specified when initializing the service.').optional().meta({ found_in: 'body' })
}).meta({ id: 'InferenceInferenceRequest' })
export type InferenceInferenceRequest = z.infer<typeof InferenceInferenceRequest>

export const InferenceInferenceResponse = InferenceInferenceResult.meta({ id: 'InferenceInferenceResponse' })
export type InferenceInferenceResponse = z.infer<typeof InferenceInferenceResponse>
