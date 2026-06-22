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

export const InferenceAmazonBedrockServiceSettings = z.object({
  access_key: z.string().describe('A valid AWS access key that has permissions to use Amazon Bedrock and access to models for inference requests.'),
  model: z.string().describe('The base model ID or an ARN to a custom model based on a foundational model. The base model IDs can be found in the Amazon Bedrock documentation. Note that the model ID must be available for the provider chosen and your IAM user must have access to the model.'),
  provider: z.string().describe('The model provider for your deployment. Note that some providers may support only certain task types. Supported providers include: * `amazontitan` - available for `text_embedding` and `completion` task types * `anthropic` - available for `chat_completion` and `completion` task types * `ai21labs` - available for `chat_completion` and `completion` task types * `cohere` - available for `chat_completion`, `completion` and `text_embedding` task types * `meta` - available for `chat_completion` and `completion` task types * `mistral` - available for `chat_completion` and `completion` task types').optional(),
  region: z.string().describe('The region that your model or ARN is deployed in. The list of available regions per model can be found in the Amazon Bedrock documentation.'),
  rate_limit: InferenceRateLimitSetting.describe('This setting helps to minimize the number of rate limit errors returned from Amazon Bedrock. By default, the `amazonbedrock` service sets the number of requests allowed per minute to 240.').optional(),
  secret_key: z.string().describe('A valid AWS secret key that is paired with the `access_key`. For informationg about creating and managing access and secret keys, refer to the AWS documentation.')
}).meta({ id: 'InferenceAmazonBedrockServiceSettings' })
export type InferenceAmazonBedrockServiceSettings = z.infer<typeof InferenceAmazonBedrockServiceSettings>

export const InferenceAmazonBedrockServiceType = z.enum(['amazonbedrock']).meta({ id: 'InferenceAmazonBedrockServiceType' })
export type InferenceAmazonBedrockServiceType = z.infer<typeof InferenceAmazonBedrockServiceType>

export const InferenceAmazonBedrockTaskSettings = z.object({
  max_new_tokens: integer.describe('For `chat_completion` and `completion` tasks, it sets the maximum number for the output tokens to be generated.').optional(),
  temperature: float.describe('For `chat_completion` and `completion` tasks, it is a number between 0.0 and 1.0 that controls the apparent creativity of the results. At temperature 0.0 the model is most deterministic, at temperature 1.0 most random. It should not be used if `top_p` or `top_k` is specified.').optional(),
  top_k: float.describe('For `chat_completion` and `completion` tasks, it limits samples to the top-K most likely words, balancing coherence and variability. It is only available for anthropic, cohere, and mistral providers. It is an alternative to `temperature`; it should not be used if `temperature` is specified.').optional(),
  top_p: float.describe('For `chat_completion` and `completion` tasks, it is a number in the range of 0.0 to 1.0, to eliminate low-probability tokens. Top-p uses nucleus sampling to select top tokens whose sum of likelihoods does not exceed a certain value, ensuring both variety and coherence. It is an alternative to `temperature`; it should not be used if `temperature` is specified.').optional()
}).meta({ id: 'InferenceAmazonBedrockTaskSettings' })
export type InferenceAmazonBedrockTaskSettings = z.infer<typeof InferenceAmazonBedrockTaskSettings>

export const InferenceAmazonBedrockTaskType = z.enum(['chat_completion', 'completion', 'text_embedding']).meta({ id: 'InferenceAmazonBedrockTaskType' })
export type InferenceAmazonBedrockTaskType = z.infer<typeof InferenceAmazonBedrockTaskType>

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

export const InferenceTaskTypeAmazonBedrock = z.enum(['chat_completion', 'completion', 'text_embedding']).meta({ id: 'InferenceTaskTypeAmazonBedrock' })
export type InferenceTaskTypeAmazonBedrock = z.infer<typeof InferenceTaskTypeAmazonBedrock>

export const InferenceInferenceEndpointInfoAmazonBedrock = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeAmazonBedrock.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoAmazonBedrock' })
export type InferenceInferenceEndpointInfoAmazonBedrock = z.infer<typeof InferenceInferenceEndpointInfoAmazonBedrock>

/**
 * Create an Amazon Bedrock inference endpoint.
 *
 * Create an inference endpoint to perform an inference task with the `amazonbedrock` service.
 *
 * >info
 * > You need to provide the access and secret keys only once, during the inference model creation. The get inference API does not retrieve your access or secret keys. After creating the inference model, you cannot change the associated key pairs. If you want to use a different access and secret key pair, delete the inference model and recreate it with the same name and the updated keys.
 */
export const InferencePutAmazonbedrockRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceAmazonBedrockTaskType.describe('The type of the inference task that the model will perform.').meta({ found_in: 'path' }),
  amazonbedrock_inference_id: Id.describe('The unique identifier of the inference endpoint.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference endpoint to be created.').optional().meta({ found_in: 'query' }),
  chunking_settings: InferenceInferenceChunkingSettings.describe('The chunking configuration object. Applies only to the `text_embedding` task type. Not applicable to the `chat_completion` and `completion` task types.').optional().meta({ found_in: 'body' }),
  service: InferenceAmazonBedrockServiceType.describe('The type of service supported for the specified task type. In this case, `amazonbedrock`.').meta({ found_in: 'body' }),
  service_settings: InferenceAmazonBedrockServiceSettings.describe('Settings used to install the inference model. These settings are specific to the `amazonbedrock` service.').meta({ found_in: 'body' }),
  task_settings: InferenceAmazonBedrockTaskSettings.describe('Settings to configure the inference task. These settings are specific to the task type you specified.').optional().meta({ found_in: 'body' })
}).meta({ id: 'InferencePutAmazonbedrockRequest' })
export type InferencePutAmazonbedrockRequest = z.infer<typeof InferencePutAmazonbedrockRequest>

export const InferencePutAmazonbedrockResponse = InferenceInferenceEndpointInfoAmazonBedrock.meta({ id: 'InferencePutAmazonbedrockResponse' })
export type InferencePutAmazonbedrockResponse = z.infer<typeof InferencePutAmazonbedrockResponse>
