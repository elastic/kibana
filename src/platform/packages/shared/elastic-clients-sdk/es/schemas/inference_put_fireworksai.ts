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

export const InferenceFireworksAISimilarityType = z.enum(['cosine', 'dot_product', 'l2_norm']).meta({ id: 'InferenceFireworksAISimilarityType' })
export type InferenceFireworksAISimilarityType = z.infer<typeof InferenceFireworksAISimilarityType>

/** This setting helps to minimize the number of rate limit errors returned from the service. */
export const InferenceRateLimitSetting = z.object({
  requests_per_minute: integer.describe('The number of requests allowed per minute. By default, the number of requests allowed per minute is set by each service as follows: * `alibabacloud-ai-search` service: `1000` * `amazonbedrock` service: `240` * `anthropic` service: `50` * `azureaistudio` service: `240` * `azureopenai` service and task type `text_embedding`: `1440` * `azureopenai` service and task types `completion` or `chat_completion`: `120` * `cohere` service: `10000` * `contextualai` service: `1000` * `elastic` service and task type `chat_completion`: `240` * `fireworksai` service: `6000` * `googleaistudio` service: `360` * `googlevertexai` service: `30000` * `hugging_face` service: `3000` * `jinaai` service: `2000` * `llama` service: `3000` * `mistral` service: `240` * `openai` service and task type `text_embedding`: `3000` * `openai` service and task type `completion`: `500` * `openshift_ai` service: `3000` * `voyageai` service: `2000` * `watsonxai` service: `120`').optional()
}).meta({ id: 'InferenceRateLimitSetting' })
export type InferenceRateLimitSetting = z.infer<typeof InferenceRateLimitSetting>

export const InferenceFireworksAIServiceSettings = z.object({
  api_key: z.string().describe('A valid API key for your Fireworks AI account. You can find or create your API keys in the Fireworks AI dashboard. IMPORTANT: You need to provide the API key only once, during the inference model creation. The get inference endpoint API does not retrieve your API key.'),
  model_id: z.string().describe('The name of the model to use for the inference task. Refer to the Fireworks AI documentation for the list of available models for chat completion, completion, and text embedding. For text embedding, supported models include the Qwen3 embedding family (e.g. `fireworks/qwen3-embedding-8b`) and other models in the Fireworks model library.'),
  url: z.string().describe('The URL endpoint to use for the requests. If not provided, the default Fireworks AI API endpoint is used.').optional(),
  dimensions: integer.describe('For a `text_embedding` task, the number of dimensions the resulting output embeddings should have. Variable-length embeddings are supported via this parameter.').optional(),
  similarity: InferenceFireworksAISimilarityType.describe('For a `text_embedding` task, the similarity measure. One of cosine, dot_product, l2_norm.').optional(),
  rate_limit: InferenceRateLimitSetting.describe('This setting helps to minimize the number of rate limit errors returned from the Fireworks AI API. Rate limit grouping is per API key only. By default, the `fireworksai` service sets the number of requests allowed per minute to 6000.').optional()
}).meta({ id: 'InferenceFireworksAIServiceSettings' })
export type InferenceFireworksAIServiceSettings = z.infer<typeof InferenceFireworksAIServiceSettings>

export const InferenceFireworksAIServiceType = z.enum(['fireworksai']).meta({ id: 'InferenceFireworksAIServiceType' })
export type InferenceFireworksAIServiceType = z.infer<typeof InferenceFireworksAIServiceType>

export const InferenceFireworksAITaskSettings = z.object({
  user: z.string().describe('For a `completion` or`chat_completion` task, specify the user issuing the request. This information can be used for abuse detection.').optional(),
  headers: z.record(z.string(), z.string()).describe('For a `completion` or`chat_completion` task. Specifies custom HTTP header parameters. For example: ``` "headers": {   "Custom-Header": "Some-Value",   "Another-Custom-Header": "Another-Value" } ```').optional()
}).meta({ id: 'InferenceFireworksAITaskSettings' })
export type InferenceFireworksAITaskSettings = z.infer<typeof InferenceFireworksAITaskSettings>

export const InferenceFireworksAITaskType = z.enum(['chat_completion', 'completion', 'text_embedding']).meta({ id: 'InferenceFireworksAITaskType' })
export type InferenceFireworksAITaskType = z.infer<typeof InferenceFireworksAITaskType>

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

export const InferenceTaskTypeFireworksAI = z.enum(['chat_completion', 'completion', 'text_embedding']).meta({ id: 'InferenceTaskTypeFireworksAI' })
export type InferenceTaskTypeFireworksAI = z.infer<typeof InferenceTaskTypeFireworksAI>

export const InferenceInferenceEndpointInfoFireworksAI = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeFireworksAI.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoFireworksAI' })
export type InferenceInferenceEndpointInfoFireworksAI = z.infer<typeof InferenceInferenceEndpointInfoFireworksAI>

/**
 * Create a Fireworks AI inference endpoint.
 *
 * Create an inference endpoint to perform an inference task with the `fireworksai` service.
 */
export const InferencePutFireworksaiRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceFireworksAITaskType.describe('The type of the inference task that the model will perform.').meta({ found_in: 'path' }),
  fireworksai_inference_id: Id.describe('The unique identifier of the inference endpoint.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference endpoint to be created.').optional().meta({ found_in: 'query' }),
  chunking_settings: InferenceInferenceChunkingSettings.describe('The chunking configuration object. Applies only to the `text_embedding` task type. Not applicable to the `completion` or `chat_completion` task types.').optional().meta({ found_in: 'body' }),
  service: InferenceFireworksAIServiceType.describe('The type of service supported for the specified task type. In this case, `fireworksai`.').meta({ found_in: 'body' }),
  service_settings: InferenceFireworksAIServiceSettings.describe('Settings used to install the inference model. These settings are specific to the `fireworksai` service.').meta({ found_in: 'body' }),
  task_settings: InferenceFireworksAITaskSettings.describe('Settings to configure the inference task. Applies only to the `completion` or `chat_completion` task types. Not applicable to the `text_embedding` task type. These settings are specific to the task type you specified.').optional().meta({ found_in: 'body' })
}).meta({ id: 'InferencePutFireworksaiRequest' })
export type InferencePutFireworksaiRequest = z.infer<typeof InferencePutFireworksaiRequest>

export const InferencePutFireworksaiResponse = InferenceInferenceEndpointInfoFireworksAI.meta({ id: 'InferencePutFireworksaiResponse' })
export type InferencePutFireworksaiResponse = z.infer<typeof InferencePutFireworksaiResponse>
