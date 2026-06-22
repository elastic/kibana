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

export const InferenceAzureOpenAIServiceSettings = z.object({
  api_key: z.string().describe('A valid API key for your Azure OpenAI account. IMPORTANT: You must specify either `api_key`, `entra_id`, or `client_secret`. If you do not provide one or you provide more than one of them, you will receive an error when you try to create your endpoint.').optional(),
  api_version: z.string().describe('The Azure API version ID to use. It is recommended to use the latest supported non-preview version.'),
  client_id: z.string().describe('For OAuth 2.0 authentication using the client credentials grant flow. The application ID that\'s assigned to your app. IMPORTANT: To configure OAuth 2.0, you must specify client_id, scopes, tenant_id, and client_secret together. If one of the fields is missing, you will receive an error when you try to create your endpoint.').optional(),
  client_secret: z.string().describe('For OAuth 2.0 authentication using the client credentials grant flow. The application secret that you created in the Microsoft app registration portal for your app. IMPORTANT: You must specify either `api_key`, `entra_id`, or `client_secret`. If you do not provide one or you provide more than one of them, you will receive an error when you try to create your endpoint. IMPORTANT: To configure OAuth 2.0, you must specify client_id, scopes, tenant_id, and client_secret together. If one of the fields is missing, you will receive an error when you try to create your endpoint.').optional(),
  deployment_id: z.string().describe('The deployment name of your deployed models. Your Azure OpenAI deployments can be found though the Azure OpenAI Studio portal that is linked to your subscription.'),
  entra_id: z.string().describe('A valid Microsoft Entra token. IMPORTANT: You must specify either `api_key`, `entra_id`, or `client_secret`. If you do not provide one or you provide more than one of them, you will receive an error when you try to create your endpoint.').optional(),
  rate_limit: InferenceRateLimitSetting.describe('This setting helps to minimize the number of rate limit errors returned from Azure. The `azureopenai` service sets a default number of requests allowed per minute depending on the task type. For `text_embedding`, it is set to `1440`. For `completion` and `chat_completion`, it is set to `120`.').optional(),
  resource_name: z.string().describe('The name of your Azure OpenAI resource. You can find this from the list of resources in the Azure Portal for your subscription.'),
  scopes: z.array(z.string()).describe('For OAuth 2.0 authentication using the client credentials grant flow. The resource identifier (application ID URI) of the resource you want, suffixed with .default For example: ``` "scopes": [   "https://cognitiveservices.azure.com/.default" ] ``` IMPORTANT: To configure OAuth 2.0, you must specify client_id, scopes, tenant_id, and client_secret together. If one of the fields is missing, you will receive an error when you try to create your endpoint.').optional(),
  tenant_id: z.string().describe('For OAuth 2.0 authentication using the client credentials grant flow. The directory tenant the application plans to operate against. IMPORTANT: To configure OAuth 2.0, you must specify client_id, scopes, tenant_id, and client_secret together. If one of the fields is missing, you will receive an error when you try to create your endpoint.').optional()
}).meta({ id: 'InferenceAzureOpenAIServiceSettings' })
export type InferenceAzureOpenAIServiceSettings = z.infer<typeof InferenceAzureOpenAIServiceSettings>

export const InferenceAzureOpenAIServiceType = z.enum(['azureopenai']).meta({ id: 'InferenceAzureOpenAIServiceType' })
export type InferenceAzureOpenAIServiceType = z.infer<typeof InferenceAzureOpenAIServiceType>

export const InferenceAzureOpenAITaskSettings = z.object({
  user: z.string().describe('Specifies the user issuing the request. This information can be used for abuse detection.').optional(),
  headers: z.record(z.string(), z.string()).describe('Specifies custom HTTP header parameters. For example: ``` "headers": {   "Custom-Header": "Some-Value",   "Another-Custom-Header": "Another-Value" } ```').optional()
}).meta({ id: 'InferenceAzureOpenAITaskSettings' })
export type InferenceAzureOpenAITaskSettings = z.infer<typeof InferenceAzureOpenAITaskSettings>

export const InferenceAzureOpenAITaskType = z.enum(['completion', 'chat_completion', 'text_embedding']).meta({ id: 'InferenceAzureOpenAITaskType' })
export type InferenceAzureOpenAITaskType = z.infer<typeof InferenceAzureOpenAITaskType>

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

export const InferenceTaskTypeAzureOpenAI = z.enum(['text_embedding', 'completion', 'chat_completion']).meta({ id: 'InferenceTaskTypeAzureOpenAI' })
export type InferenceTaskTypeAzureOpenAI = z.infer<typeof InferenceTaskTypeAzureOpenAI>

export const InferenceInferenceEndpointInfoAzureOpenAI = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeAzureOpenAI.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoAzureOpenAI' })
export type InferenceInferenceEndpointInfoAzureOpenAI = z.infer<typeof InferenceInferenceEndpointInfoAzureOpenAI>

/**
 * Create an Azure OpenAI inference endpoint.
 *
 * Create an inference endpoint to perform an inference task with the `azureopenai` service.
 *
 * The list of chat completion models that you can choose from in your Azure OpenAI deployment include:
 *
 * * [GPT-4 and GPT-4 Turbo models](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models?tabs=global-standard%2Cstandard-chat-completions#gpt-4-and-gpt-4-turbo-models)
 * * [GPT-3.5](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models?tabs=global-standard%2Cstandard-chat-completions#gpt-35)
 *
 * The list of embeddings models that you can choose from in your deployment can be found in the [Azure models documentation](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models?tabs=global-standard%2Cstandard-chat-completions#embeddings).
 */
export const InferencePutAzureopenaiRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceAzureOpenAITaskType.describe('The type of the inference task that the model will perform. NOTE: The `chat_completion` task type only supports streaming and only through the _stream API.').meta({ found_in: 'path' }),
  azureopenai_inference_id: Id.describe('The unique identifier of the inference endpoint.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference endpoint to be created.').optional().meta({ found_in: 'query' }),
  chunking_settings: InferenceInferenceChunkingSettings.describe('The chunking configuration object. Applies only to the `text_embedding` task type. Not applicable to the `completion` and `chat_completion` task types.').optional().meta({ found_in: 'body' }),
  service: InferenceAzureOpenAIServiceType.describe('The type of service supported for the specified task type. In this case, `azureopenai`.').meta({ found_in: 'body' }),
  service_settings: InferenceAzureOpenAIServiceSettings.describe('Settings used to install the inference model. These settings are specific to the `azureopenai` service.').meta({ found_in: 'body' }),
  task_settings: InferenceAzureOpenAITaskSettings.describe('Settings to configure the inference task. These settings are specific to the task type you specified.').optional().meta({ found_in: 'body' })
}).meta({ id: 'InferencePutAzureopenaiRequest' })
export type InferencePutAzureopenaiRequest = z.infer<typeof InferencePutAzureopenaiRequest>

export const InferencePutAzureopenaiResponse = InferenceInferenceEndpointInfoAzureOpenAI.meta({ id: 'InferencePutAzureopenaiResponse' })
export type InferencePutAzureopenaiResponse = z.infer<typeof InferencePutAzureopenaiResponse>
