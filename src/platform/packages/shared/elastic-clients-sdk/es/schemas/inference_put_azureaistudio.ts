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

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

/** This setting helps to minimize the number of rate limit errors returned from the service. */
export const InferenceRateLimitSetting = z.object({
  requests_per_minute: integer.describe('The number of requests allowed per minute. By default, the number of requests allowed per minute is set by each service as follows: * `alibabacloud-ai-search` service: `1000` * `amazonbedrock` service: `240` * `anthropic` service: `50` * `azureaistudio` service: `240` * `azureopenai` service and task type `text_embedding`: `1440` * `azureopenai` service and task types `completion` or `chat_completion`: `120` * `cohere` service: `10000` * `contextualai` service: `1000` * `elastic` service and task type `chat_completion`: `240` * `fireworksai` service: `6000` * `googleaistudio` service: `360` * `googlevertexai` service: `30000` * `hugging_face` service: `3000` * `jinaai` service: `2000` * `llama` service: `3000` * `mistral` service: `240` * `openai` service and task type `text_embedding`: `3000` * `openai` service and task type `completion`: `500` * `openshift_ai` service: `3000` * `voyageai` service: `2000` * `watsonxai` service: `120`').optional()
}).meta({ id: 'InferenceRateLimitSetting' })
export type InferenceRateLimitSetting = z.infer<typeof InferenceRateLimitSetting>

export const InferenceAzureAiStudioServiceSettings = z.object({
  api_key: z.string().describe('A valid API key of your Azure AI Studio model deployment. This key can be found on the overview page for your deployment in the management section of your Azure AI Studio account. IMPORTANT: You need to provide the API key only once, during the inference model creation. The get inference endpoint API does not retrieve your API key.'),
  endpoint_type: z.string().describe('The type of endpoint that is available for deployment through Azure AI Studio: `token` or `realtime`. The `token` endpoint type is for "pay as you go" endpoints that are billed per token. The `realtime` endpoint type is for "real-time" endpoints that are billed per hour of usage.'),
  target: z.string().describe('The target URL of your Azure AI Studio model deployment. This can be found on the overview page for your deployment in the management section of your Azure AI Studio account.'),
  provider: z.string().describe('The model provider for your deployment. Note that some providers may support only certain task types. Supported providers include: * `cohere` - available for `text_embedding`, `rerank` and `completion` task types * `databricks` - available for `completion` task type only * `meta` - available for `completion` task type only * `microsoft_phi` - available for `completion` task type only * `mistral` - available for `completion` task type only * `openai` - available for `text_embedding` and `completion` task types'),
  rate_limit: InferenceRateLimitSetting.describe('This setting helps to minimize the number of rate limit errors returned from Azure AI Studio. By default, the `azureaistudio` service sets the number of requests allowed per minute to 240.').optional()
}).meta({ id: 'InferenceAzureAiStudioServiceSettings' })
export type InferenceAzureAiStudioServiceSettings = z.infer<typeof InferenceAzureAiStudioServiceSettings>

export const InferenceAzureAiStudioServiceType = z.enum(['azureaistudio']).meta({ id: 'InferenceAzureAiStudioServiceType' })
export type InferenceAzureAiStudioServiceType = z.infer<typeof InferenceAzureAiStudioServiceType>

export const InferenceAzureAiStudioTaskSettings = z.object({
  do_sample: float.describe('For a `completion` task, instruct the inference process to perform sampling. It has no effect unless `temperature` or `top_p` is specified.').optional(),
  max_new_tokens: integer.describe('For a `completion` task, provide a hint for the maximum number of output tokens to be generated.').optional(),
  temperature: float.describe('For a `completion` task, control the apparent creativity of generated completions with a sampling temperature. It must be a number in the range of 0.0 to 2.0. It should not be used if `top_p` is specified.').optional(),
  top_p: float.describe('For a `completion` task, make the model consider the results of the tokens with nucleus sampling probability. It is an alternative value to `temperature` and must be a number in the range of 0.0 to 2.0. It should not be used if `temperature` is specified.').optional(),
  user: z.string().describe('For a `text_embedding` task, specify the user issuing the request. This information can be used for abuse detection.').optional(),
  return_documents: z.boolean().describe('For a `rerank` task, return doc text within the results.').optional(),
  top_n: integer.describe('For a `rerank` task, the number of most relevant documents to return. It defaults to the number of the documents.').optional()
}).meta({ id: 'InferenceAzureAiStudioTaskSettings' })
export type InferenceAzureAiStudioTaskSettings = z.infer<typeof InferenceAzureAiStudioTaskSettings>

export const InferenceAzureAiStudioTaskType = z.enum(['completion', 'rerank', 'text_embedding']).meta({ id: 'InferenceAzureAiStudioTaskType' })
export type InferenceAzureAiStudioTaskType = z.infer<typeof InferenceAzureAiStudioTaskType>

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

export const InferenceTaskTypeAzureAIStudio = z.enum(['text_embedding', 'completion', 'rerank']).meta({ id: 'InferenceTaskTypeAzureAIStudio' })
export type InferenceTaskTypeAzureAIStudio = z.infer<typeof InferenceTaskTypeAzureAIStudio>

export const InferenceInferenceEndpointInfoAzureAIStudio = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeAzureAIStudio.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoAzureAIStudio' })
export type InferenceInferenceEndpointInfoAzureAIStudio = z.infer<typeof InferenceInferenceEndpointInfoAzureAIStudio>

/**
 * Create an Azure AI studio inference endpoint.
 *
 * Create an inference endpoint to perform an inference task with the `azureaistudio` service.
 */
export const InferencePutAzureaistudioRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceAzureAiStudioTaskType.describe('The type of the inference task that the model will perform.').meta({ found_in: 'path' }),
  azureaistudio_inference_id: Id.describe('The unique identifier of the inference endpoint.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference endpoint to be created.').optional().meta({ found_in: 'query' }),
  chunking_settings: InferenceInferenceChunkingSettings.describe('The chunking configuration object. Applies only to the `text_embedding` task type. Not applicable to the `rerank` or `completion` task types.').optional().meta({ found_in: 'body' }),
  service: InferenceAzureAiStudioServiceType.describe('The type of service supported for the specified task type. In this case, `azureaistudio`.').meta({ found_in: 'body' }),
  service_settings: InferenceAzureAiStudioServiceSettings.describe('Settings used to install the inference model. These settings are specific to the `azureaistudio` service.').meta({ found_in: 'body' }),
  task_settings: InferenceAzureAiStudioTaskSettings.describe('Settings to configure the inference task. These settings are specific to the task type you specified.').optional().meta({ found_in: 'body' })
}).meta({ id: 'InferencePutAzureaistudioRequest' })
export type InferencePutAzureaistudioRequest = z.infer<typeof InferencePutAzureaistudioRequest>

export const InferencePutAzureaistudioResponse = InferenceInferenceEndpointInfoAzureAIStudio.meta({ id: 'InferencePutAzureaistudioResponse' })
export type InferencePutAzureaistudioResponse = z.infer<typeof InferencePutAzureaistudioResponse>
