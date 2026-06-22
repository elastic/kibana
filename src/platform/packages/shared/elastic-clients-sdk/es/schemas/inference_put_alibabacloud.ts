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

/** This setting helps to minimize the number of rate limit errors returned from the service. */
export const InferenceRateLimitSetting = z.object({
  requests_per_minute: integer.describe('The number of requests allowed per minute. By default, the number of requests allowed per minute is set by each service as follows: * `alibabacloud-ai-search` service: `1000` * `amazonbedrock` service: `240` * `anthropic` service: `50` * `azureaistudio` service: `240` * `azureopenai` service and task type `text_embedding`: `1440` * `azureopenai` service and task types `completion` or `chat_completion`: `120` * `cohere` service: `10000` * `contextualai` service: `1000` * `elastic` service and task type `chat_completion`: `240` * `fireworksai` service: `6000` * `googleaistudio` service: `360` * `googlevertexai` service: `30000` * `hugging_face` service: `3000` * `jinaai` service: `2000` * `llama` service: `3000` * `mistral` service: `240` * `openai` service and task type `text_embedding`: `3000` * `openai` service and task type `completion`: `500` * `openshift_ai` service: `3000` * `voyageai` service: `2000` * `watsonxai` service: `120`').optional()
}).meta({ id: 'InferenceRateLimitSetting' })
export type InferenceRateLimitSetting = z.infer<typeof InferenceRateLimitSetting>

export const InferenceAlibabaCloudServiceSettings = z.object({
  api_key: z.string().describe('A valid API key for the AlibabaCloud AI Search API.'),
  host: z.string().describe('The name of the host address used for the inference task. You can find the host address in the API keys section of the documentation.'),
  rate_limit: InferenceRateLimitSetting.describe('This setting helps to minimize the number of rate limit errors returned from AlibabaCloud AI Search. By default, the `alibabacloud-ai-search` service sets the number of requests allowed per minute to `1000`.').optional(),
  service_id: z.string().describe('The name of the model service to use for the inference task. The following service IDs are available for the `completion` task: * `ops-qwen-turbo` * `qwen-turbo` * `qwen-plus` * `qwen-max ÷ qwen-max-longcontext` The following service ID is available for the `rerank` task: * `ops-bge-reranker-larger` The following service ID is available for the `sparse_embedding` task: * `ops-text-sparse-embedding-001` The following service IDs are available for the `text_embedding` task: `ops-text-embedding-001` `ops-text-embedding-zh-001` `ops-text-embedding-en-001` `ops-text-embedding-002`'),
  workspace: z.string().describe('The name of the workspace used for the inference task.')
}).meta({ id: 'InferenceAlibabaCloudServiceSettings' })
export type InferenceAlibabaCloudServiceSettings = z.infer<typeof InferenceAlibabaCloudServiceSettings>

export const InferenceAlibabaCloudServiceType = z.enum(['alibabacloud-ai-search']).meta({ id: 'InferenceAlibabaCloudServiceType' })
export type InferenceAlibabaCloudServiceType = z.infer<typeof InferenceAlibabaCloudServiceType>

export const InferenceAlibabaCloudTaskSettings = z.object({
  input_type: z.string().describe('For a `sparse_embedding` or `text_embedding` task, specify the type of input passed to the model. Valid values are: * `ingest` for storing document embeddings in a vector database. * `search` for storing embeddings of search queries run against a vector database to find relevant documents.').optional(),
  return_token: z.boolean().describe('For a `sparse_embedding` task, it affects whether the token name will be returned in the response. It defaults to `false`, which means only the token ID will be returned in the response.').optional()
}).meta({ id: 'InferenceAlibabaCloudTaskSettings' })
export type InferenceAlibabaCloudTaskSettings = z.infer<typeof InferenceAlibabaCloudTaskSettings>

export const InferenceAlibabaCloudTaskType = z.enum(['completion', 'rerank', 'sparse_embedding', 'text_embedding']).meta({ id: 'InferenceAlibabaCloudTaskType' })
export type InferenceAlibabaCloudTaskType = z.infer<typeof InferenceAlibabaCloudTaskType>

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

export const InferenceTaskTypeAlibabaCloudAI = z.enum(['text_embedding', 'rerank', 'completion', 'sparse_embedding']).meta({ id: 'InferenceTaskTypeAlibabaCloudAI' })
export type InferenceTaskTypeAlibabaCloudAI = z.infer<typeof InferenceTaskTypeAlibabaCloudAI>

export const InferenceInferenceEndpointInfoAlibabaCloudAI = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeAlibabaCloudAI.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoAlibabaCloudAI' })
export type InferenceInferenceEndpointInfoAlibabaCloudAI = z.infer<typeof InferenceInferenceEndpointInfoAlibabaCloudAI>

/**
 * Create an AlibabaCloud AI Search inference endpoint.
 *
 * Create an inference endpoint to perform an inference task with the `alibabacloud-ai-search` service.
 */
export const InferencePutAlibabacloudRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceAlibabaCloudTaskType.describe('The type of the inference task that the model will perform.').meta({ found_in: 'path' }),
  alibabacloud_inference_id: Id.describe('The unique identifier of the inference endpoint.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference endpoint to be created.').optional().meta({ found_in: 'query' }),
  chunking_settings: InferenceInferenceChunkingSettings.describe('The chunking configuration object. Applies only to the `sparse_embedding` or `text_embedding` task types. Not applicable to the `rerank` or `completion` task types.').optional().meta({ found_in: 'body' }),
  service: InferenceAlibabaCloudServiceType.describe('The type of service supported for the specified task type. In this case, `alibabacloud-ai-search`.').meta({ found_in: 'body' }),
  service_settings: InferenceAlibabaCloudServiceSettings.describe('Settings used to install the inference model. These settings are specific to the `alibabacloud-ai-search` service.').meta({ found_in: 'body' }),
  task_settings: InferenceAlibabaCloudTaskSettings.describe('Settings to configure the inference task. These settings are specific to the task type you specified.').optional().meta({ found_in: 'body' })
}).meta({ id: 'InferencePutAlibabacloudRequest' })
export type InferencePutAlibabacloudRequest = z.infer<typeof InferencePutAlibabacloudRequest>

export const InferencePutAlibabacloudResponse = InferenceInferenceEndpointInfoAlibabaCloudAI.meta({ id: 'InferencePutAlibabacloudResponse' })
export type InferencePutAlibabacloudResponse = z.infer<typeof InferencePutAlibabacloudResponse>
