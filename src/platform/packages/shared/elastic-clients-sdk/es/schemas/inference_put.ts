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

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

/** Chunking configuration object */
export const InferenceInferenceChunkingSettings = z.object({
  max_chunk_size: integer.describe('The maximum size of a chunk in words. This value cannot be lower than `20` (for `sentence` strategy) or `10` (for `word` strategy). This value should not exceed the window size for the associated model.').optional(),
  overlap: integer.describe('The number of overlapping words for chunks. It is applicable only to a `word` chunking strategy. This value cannot be higher than half the `max_chunk_size` value.').optional(),
  sentence_overlap: integer.describe('The number of overlapping sentences for chunks. It is applicable only for a `sentence` chunking strategy. It can be either `1` or `0`.').optional(),
  separator_group: z.string().describe('Only applicable to the `recursive` strategy and required when using it. Sets a predefined list of separators in the saved chunking settings based on the selected text type. Values can be `markdown` or `plaintext`. Using this parameter is an alternative to manually specifying a custom `separators` list.').optional(),
  separators: z.array(z.string()).describe('Only applicable to the `recursive` strategy and required when using it. A list of strings used as possible split points when chunking text. Each string can be a plain string or a regular expression (regex) pattern. The system tries each separator in order to split the text, starting from the first item in the list. After splitting, it attempts to recombine smaller pieces into larger chunks that stay within the `max_chunk_size` limit, to reduce the total number of chunks generated.').optional(),
  strategy: z.string().describe('The chunking strategy: `sentence`, `word`, `none` or `recursive`.  * If `strategy` is set to `recursive`, you must also specify: - `max_chunk_size` - either `separators` or`separator_group` Learn more about different chunking strategies in the linked documentation.').optional()
}).meta({ id: 'InferenceInferenceChunkingSettings' })
export type InferenceInferenceChunkingSettings = z.infer<typeof InferenceInferenceChunkingSettings>

export const InferenceServiceSettings = z.any().meta({ id: 'InferenceServiceSettings' })
export type InferenceServiceSettings = z.infer<typeof InferenceServiceSettings>

export const InferenceTaskSettings = z.any().meta({ id: 'InferenceTaskSettings' })
export type InferenceTaskSettings = z.infer<typeof InferenceTaskSettings>

/** Configuration options when storing the inference endpoint */
export const InferenceInferenceEndpoint = z.object({
  chunking_settings: InferenceInferenceChunkingSettings.describe('The chunking configuration object. Applies only to the `embedding`, `sparse_embedding` and `text_embedding` task types. Not applicable to the `rerank`, `completion`, or `chat_completion` task types.').optional(),
  service: z.string().describe('The service type'),
  service_settings: InferenceServiceSettings.describe('Settings specific to the service'),
  task_settings: InferenceTaskSettings.describe('Task settings specific to the service and task type').optional()
}).meta({ id: 'InferenceInferenceEndpoint' })
export type InferenceInferenceEndpoint = z.infer<typeof InferenceInferenceEndpoint>

export const InferenceTaskType = z.enum(['sparse_embedding', 'text_embedding', 'rerank', 'completion', 'chat_completion', 'embedding']).meta({ id: 'InferenceTaskType' })
export type InferenceTaskType = z.infer<typeof InferenceTaskType>

/** Represents an inference endpoint as returned by the GET API */
export const InferenceInferenceEndpointInfo = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskType.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfo' })
export type InferenceInferenceEndpointInfo = z.infer<typeof InferenceInferenceEndpointInfo>

/**
 * Create an inference endpoint.
 *
 * IMPORTANT: The inference APIs enable you to use certain services, such as built-in machine learning models (ELSER, E5), models uploaded through Eland, Cohere, OpenAI, Mistral, Azure OpenAI, Google AI Studio, Google Vertex AI, Anthropic, Watsonx.ai, or Hugging Face.
 * For built-in models and models uploaded through Eland, the inference APIs offer an alternative way to use and manage trained models.
 * However, if you do not plan to use the inference APIs to use these models or if you want to use non-NLP models, use the machine learning trained model APIs.
 *
 * The following integrations are available through the inference API. You can find the available task types next to the integration name:
 * * AI21 (`chat_completion`, `completion`)
 * * AlibabaCloud AI Search (`completion`, `rerank`, `sparse_embedding`, `text_embedding`)
 * * Amazon Bedrock (`chat_completion`, `completion`, `text_embedding`)
 * * Amazon SageMaker (`chat_completion`, `completion`, `rerank`, `sparse_embedding`, `text_embedding`)
 * * Anthropic (`completion`)
 * * Azure AI Studio (`completion`, `rerank`, `text_embedding`)
 * * Azure OpenAI (`chat_completion`, `completion`, `text_embedding`)
 * * Cohere (`completion`, `rerank`, `text_embedding`)
 * * DeepSeek (`chat_completion`, `completion`)
 * * Elasticsearch (`rerank`, `sparse_embedding`, `text_embedding` - this service is for built-in models and models uploaded through Eland)
 * * ELSER (`sparse_embedding`)
 * * Fireworks AI (`chat_completion`, `completion`, `text_embedding`)
 * * Google AI Studio (`completion`, `text_embedding`)
 * * Google Vertex AI (`chat_completion`, `completion`, `rerank`, `text_embedding`)
 * * Groq (`chat_completion`)
 * * Hugging Face (`chat_completion`, `completion`, `rerank`, `text_embedding`)
 * * JinaAI (`embedding`, `rerank`, `text_embedding`)
 * * Llama (`chat_completion`, `completion`, `text_embedding`)
 * * Mistral (`chat_completion`, `completion`, `text_embedding`)
 * * Nvidia (`chat_completion`, `completion`, `text_embedding`, `rerank`)
 * * OpenAI (`chat_completion`, `completion`, `text_embedding`)
 * * OpenShift AI (`chat_completion`, `completion`, `rerank`, `text_embedding`)
 * * VoyageAI (`rerank`, `text_embedding`)
 * * Watsonx (`chat_completion`, `completion`, `rerank`, `text_embedding`)
 */
export const InferencePutRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceTaskType.describe('The task type. Refer to the integration list in the API description for the available task types.').optional().meta({ found_in: 'path' }),
  inference_id: Id.describe('The inference Id').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference endpoint to be created.').optional().meta({ found_in: 'query' }),
  inference_config: InferenceInferenceEndpoint.meta({ found_in: 'body' })
}).meta({ id: 'InferencePutRequest' })
export type InferencePutRequest = z.infer<typeof InferencePutRequest>

export const InferencePutResponse = InferenceInferenceEndpointInfo.meta({ id: 'InferencePutResponse' })
export type InferencePutResponse = z.infer<typeof InferencePutResponse>
