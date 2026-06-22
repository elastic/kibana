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

export const InferenceTaskTypeLlama = z.enum(['text_embedding', 'chat_completion', 'completion']).meta({ id: 'InferenceTaskTypeLlama' })
export type InferenceTaskTypeLlama = z.infer<typeof InferenceTaskTypeLlama>

export const InferenceInferenceEndpointInfoLlama = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeLlama.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoLlama' })
export type InferenceInferenceEndpointInfoLlama = z.infer<typeof InferenceInferenceEndpointInfoLlama>

export const InferenceLlamaSimilarityType = z.enum(['cosine', 'dot_product', 'l2_norm']).meta({ id: 'InferenceLlamaSimilarityType' })
export type InferenceLlamaSimilarityType = z.infer<typeof InferenceLlamaSimilarityType>

/** This setting helps to minimize the number of rate limit errors returned from the service. */
export const InferenceRateLimitSetting = z.object({
  requests_per_minute: integer.describe('The number of requests allowed per minute. By default, the number of requests allowed per minute is set by each service as follows: * `alibabacloud-ai-search` service: `1000` * `amazonbedrock` service: `240` * `anthropic` service: `50` * `azureaistudio` service: `240` * `azureopenai` service and task type `text_embedding`: `1440` * `azureopenai` service and task types `completion` or `chat_completion`: `120` * `cohere` service: `10000` * `contextualai` service: `1000` * `elastic` service and task type `chat_completion`: `240` * `fireworksai` service: `6000` * `googleaistudio` service: `360` * `googlevertexai` service: `30000` * `hugging_face` service: `3000` * `jinaai` service: `2000` * `llama` service: `3000` * `mistral` service: `240` * `openai` service and task type `text_embedding`: `3000` * `openai` service and task type `completion`: `500` * `openshift_ai` service: `3000` * `voyageai` service: `2000` * `watsonxai` service: `120`').optional()
}).meta({ id: 'InferenceRateLimitSetting' })
export type InferenceRateLimitSetting = z.infer<typeof InferenceRateLimitSetting>

export const InferenceLlamaServiceSettings = z.object({
  url: z.string().describe('The URL endpoint of the Llama stack endpoint. URL must contain: * For `text_embedding` task - `/v1/inference/embeddings`. * For `completion` and `chat_completion` tasks - `/v1/openai/v1/chat/completions`.'),
  model_id: z.string().describe('The name of the model to use for the inference task. Refer to the Llama downloading models documentation for different ways of getting a list of available models and downloading them. Service has been tested and confirmed to be working with the following models: * For `text_embedding` task - `all-MiniLM-L6-v2`. * For `completion` and `chat_completion` tasks - `llama3.2:3b`.'),
  max_input_tokens: integer.describe('For a `text_embedding` task, the maximum number of tokens per input before chunking occurs.').optional(),
  similarity: InferenceLlamaSimilarityType.describe('For a `text_embedding` task, the similarity measure. One of cosine, dot_product, l2_norm.').optional(),
  rate_limit: InferenceRateLimitSetting.describe('This setting helps to minimize the number of rate limit errors returned from the Llama API. By default, the `llama` service sets the number of requests allowed per minute to 3000.').optional()
}).meta({ id: 'InferenceLlamaServiceSettings' })
export type InferenceLlamaServiceSettings = z.infer<typeof InferenceLlamaServiceSettings>

export const InferenceLlamaServiceType = z.enum(['llama']).meta({ id: 'InferenceLlamaServiceType' })
export type InferenceLlamaServiceType = z.infer<typeof InferenceLlamaServiceType>

export const InferenceLlamaTaskType = z.enum(['text_embedding', 'completion', 'chat_completion']).meta({ id: 'InferenceLlamaTaskType' })
export type InferenceLlamaTaskType = z.infer<typeof InferenceLlamaTaskType>

/**
 * Create a Llama inference endpoint.
 *
 * Create an inference endpoint to perform an inference task with the `llama` service.
 */
export const InferencePutLlamaRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceLlamaTaskType.describe('The type of the inference task that the model will perform.').meta({ found_in: 'path' }),
  llama_inference_id: Id.describe('The unique identifier of the inference endpoint.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference endpoint to be created.').optional().meta({ found_in: 'query' }),
  chunking_settings: InferenceInferenceChunkingSettings.describe('The chunking configuration object. Applies only to the `text_embedding` task type. Not applicable to the `completion` or `chat_completion` task types.').optional().meta({ found_in: 'body' }),
  service: InferenceLlamaServiceType.describe('The type of service supported for the specified task type. In this case, `llama`.').meta({ found_in: 'body' }),
  service_settings: InferenceLlamaServiceSettings.describe('Settings used to install the inference model. These settings are specific to the `llama` service.').meta({ found_in: 'body' })
}).meta({ id: 'InferencePutLlamaRequest' })
export type InferencePutLlamaRequest = z.infer<typeof InferencePutLlamaRequest>

export const InferencePutLlamaResponse = InferenceInferenceEndpointInfoLlama.meta({ id: 'InferencePutLlamaResponse' })
export type InferencePutLlamaResponse = z.infer<typeof InferencePutLlamaResponse>
