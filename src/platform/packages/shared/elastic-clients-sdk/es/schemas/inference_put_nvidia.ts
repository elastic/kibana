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

export const InferenceCohereTruncateType = z.enum(['END', 'NONE', 'START']).meta({ id: 'InferenceCohereTruncateType' })
export type InferenceCohereTruncateType = z.infer<typeof InferenceCohereTruncateType>

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

export const InferenceTaskTypeNvidia = z.enum(['chat_completion', 'completion', 'rerank', 'text_embedding']).meta({ id: 'InferenceTaskTypeNvidia' })
export type InferenceTaskTypeNvidia = z.infer<typeof InferenceTaskTypeNvidia>

export const InferenceInferenceEndpointInfoNvidia = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference ID'),
  task_type: InferenceTaskTypeNvidia.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoNvidia' })
export type InferenceInferenceEndpointInfoNvidia = z.infer<typeof InferenceInferenceEndpointInfoNvidia>

export const InferenceNvidiaInputType = z.enum(['ingest', 'search']).meta({ id: 'InferenceNvidiaInputType' })
export type InferenceNvidiaInputType = z.infer<typeof InferenceNvidiaInputType>

export const InferenceNvidiaSimilarityType = z.enum(['cosine', 'dot_product', 'l2_norm']).meta({ id: 'InferenceNvidiaSimilarityType' })
export type InferenceNvidiaSimilarityType = z.infer<typeof InferenceNvidiaSimilarityType>

/** This setting helps to minimize the number of rate limit errors returned from the service. */
export const InferenceRateLimitSetting = z.object({
  requests_per_minute: integer.describe('The number of requests allowed per minute. By default, the number of requests allowed per minute is set by each service as follows: * `alibabacloud-ai-search` service: `1000` * `amazonbedrock` service: `240` * `anthropic` service: `50` * `azureaistudio` service: `240` * `azureopenai` service and task type `text_embedding`: `1440` * `azureopenai` service and task types `completion` or `chat_completion`: `120` * `cohere` service: `10000` * `contextualai` service: `1000` * `elastic` service and task type `chat_completion`: `240` * `fireworksai` service: `6000` * `googleaistudio` service: `360` * `googlevertexai` service: `30000` * `hugging_face` service: `3000` * `jinaai` service: `2000` * `llama` service: `3000` * `mistral` service: `240` * `openai` service and task type `text_embedding`: `3000` * `openai` service and task type `completion`: `500` * `openshift_ai` service: `3000` * `voyageai` service: `2000` * `watsonxai` service: `120`').optional()
}).meta({ id: 'InferenceRateLimitSetting' })
export type InferenceRateLimitSetting = z.infer<typeof InferenceRateLimitSetting>

export const InferenceNvidiaServiceSettings = z.object({
  api_key: z.string().describe('A valid API key for your Nvidia endpoint. Can be found in `API Keys` section of Nvidia account settings.'),
  url: z.string().describe('The URL of the Nvidia model endpoint. If not provided, the default endpoint URL is used depending on the task type: * For `text_embedding` task - `https://integrate.api.nvidia.com/v1/embeddings`. * For `completion` and `chat_completion` tasks - `https://integrate.api.nvidia.com/v1/chat/completions`. * For `rerank` task - `https://ai.api.nvidia.com/v1/retrieval/nvidia/reranking`.').optional(),
  model_id: z.string().describe('The name of the model to use for the inference task. Refer to the model\'s documentation for the name if needed. Service has been tested and confirmed to be working with the following models: * For `text_embedding` task - `nvidia/llama-3.2-nv-embedqa-1b-v2`. * For `completion` and `chat_completion` tasks - `microsoft/phi-3-mini-128k-instruct`. * For `rerank` task - `nv-rerank-qa-mistral-4b:1`. Service doesn\'t support `text_embedding` task `baai/bge-m3` and `nvidia/nvclip` models due to them not recognizing the `input_type` parameter.'),
  max_input_tokens: integer.describe('For a `text_embedding` task, the maximum number of tokens per input. Inputs exceeding this value are truncated prior to sending to the Nvidia API.').optional(),
  similarity: InferenceNvidiaSimilarityType.describe('For a `text_embedding` task, the similarity measure. One of cosine, dot_product, l2_norm.').optional(),
  rate_limit: InferenceRateLimitSetting.describe('This setting helps to minimize the number of rate limit errors returned from the Nvidia API. By default, the `nvidia` service sets the number of requests allowed per minute to 3000.').optional()
}).meta({ id: 'InferenceNvidiaServiceSettings' })
export type InferenceNvidiaServiceSettings = z.infer<typeof InferenceNvidiaServiceSettings>

export const InferenceNvidiaServiceType = z.enum(['nvidia']).meta({ id: 'InferenceNvidiaServiceType' })
export type InferenceNvidiaServiceType = z.infer<typeof InferenceNvidiaServiceType>

export const InferenceNvidiaTaskSettings = z.object({
  input_type: InferenceNvidiaInputType.describe('For a `text_embedding` task, type of input sent to the Nvidia endpoint. Valid values are: * `ingest`: Mapped to Nvidia\'s `passage` value in request. Used when generating embeddings during indexing. * `search`: Mapped to Nvidia\'s `query` value in request. Used when generating embeddings during querying. IMPORTANT: For Nvidia endpoints, if the `input_type` field is not specified, it defaults to `query`.').optional(),
  truncate: InferenceCohereTruncateType.describe('For a `text_embedding` task, the method used by the Nvidia model to handle inputs longer than the maximum token length. Valid values are: * `END`: When the input exceeds the maximum input token length, the end of the input is discarded. * `NONE`: When the input exceeds the maximum input token length, an error is returned. * `START`: When the input exceeds the maximum input token length, the start of the input is discarded.').optional()
}).meta({ id: 'InferenceNvidiaTaskSettings' })
export type InferenceNvidiaTaskSettings = z.infer<typeof InferenceNvidiaTaskSettings>

export const InferenceNvidiaTaskType = z.enum(['chat_completion', 'completion', 'rerank', 'text_embedding']).meta({ id: 'InferenceNvidiaTaskType' })
export type InferenceNvidiaTaskType = z.infer<typeof InferenceNvidiaTaskType>

/**
 * Create an Nvidia inference endpoint.
 *
 * Create an inference endpoint to perform an inference task with the `nvidia` service.
 */
export const InferencePutNvidiaRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceNvidiaTaskType.describe('The type of the inference task that the model will perform. NOTE: The `chat_completion` task type only supports streaming and only through the _stream API.').meta({ found_in: 'path' }),
  nvidia_inference_id: Id.describe('The unique identifier of the inference endpoint.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference endpoint to be created.').optional().meta({ found_in: 'query' }),
  chunking_settings: InferenceInferenceChunkingSettings.describe('The chunking configuration object. Applies only to the `text_embedding` task type. Not applicable to the `rerank`, `completion`, or `chat_completion` task types.').optional().meta({ found_in: 'body' }),
  service: InferenceNvidiaServiceType.describe('The type of service supported for the specified task type. In this case, `nvidia`.').meta({ found_in: 'body' }),
  service_settings: InferenceNvidiaServiceSettings.describe('Settings used to install the inference model. These settings are specific to the `nvidia` service.').meta({ found_in: 'body' }),
  task_settings: InferenceNvidiaTaskSettings.describe('Settings to configure the inference task. Applies only to the `text_embedding` task type. Not applicable to the `rerank`, `completion`, or `chat_completion` task types. These settings are specific to the task type you specified.').optional().meta({ found_in: 'body' })
}).meta({ id: 'InferencePutNvidiaRequest' })
export type InferencePutNvidiaRequest = z.infer<typeof InferencePutNvidiaRequest>

export const InferencePutNvidiaResponse = InferenceInferenceEndpointInfoNvidia.meta({ id: 'InferencePutNvidiaResponse' })
export type InferencePutNvidiaResponse = z.infer<typeof InferencePutNvidiaResponse>
