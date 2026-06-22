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

export const InferenceAnthropicServiceSettings = z.object({
  api_key: z.string().describe('A valid API key for the Anthropic API.'),
  model_id: z.string().describe('The name of the model to use for the inference task. Refer to the Anthropic documentation for the list of supported models.'),
  rate_limit: InferenceRateLimitSetting.describe('This setting helps to minimize the number of rate limit errors returned from Anthropic. By default, the `anthropic` service sets the number of requests allowed per minute to 50.').optional()
}).meta({ id: 'InferenceAnthropicServiceSettings' })
export type InferenceAnthropicServiceSettings = z.infer<typeof InferenceAnthropicServiceSettings>

export const InferenceAnthropicServiceType = z.enum(['anthropic']).meta({ id: 'InferenceAnthropicServiceType' })
export type InferenceAnthropicServiceType = z.infer<typeof InferenceAnthropicServiceType>

export const InferenceAnthropicTaskSettings = z.object({
  max_tokens: integer.describe('For a `completion` task, it is the maximum number of tokens to generate before stopping.'),
  temperature: float.describe('For a `completion` task, it is the amount of randomness injected into the response. For more details about the supported range, refer to Anthropic documentation.').optional(),
  top_k: integer.describe('For a `completion` task, it specifies to only sample from the top K options for each subsequent token. It is recommended for advanced use cases only. You usually only need to use `temperature`.').optional(),
  top_p: float.describe('For a `completion` task, it specifies to use Anthropic\'s nucleus sampling. In nucleus sampling, Anthropic computes the cumulative distribution over all the options for each subsequent token in decreasing probability order and cuts it off once it reaches the specified probability. You should either alter `temperature` or `top_p`, but not both. It is recommended for advanced use cases only. You usually only need to use `temperature`.').optional()
}).meta({ id: 'InferenceAnthropicTaskSettings' })
export type InferenceAnthropicTaskSettings = z.infer<typeof InferenceAnthropicTaskSettings>

export const InferenceAnthropicTaskType = z.enum(['completion']).meta({ id: 'InferenceAnthropicTaskType' })
export type InferenceAnthropicTaskType = z.infer<typeof InferenceAnthropicTaskType>

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

export const InferenceTaskTypeAnthropic = z.enum(['completion']).meta({ id: 'InferenceTaskTypeAnthropic' })
export type InferenceTaskTypeAnthropic = z.infer<typeof InferenceTaskTypeAnthropic>

export const InferenceInferenceEndpointInfoAnthropic = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeAnthropic.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoAnthropic' })
export type InferenceInferenceEndpointInfoAnthropic = z.infer<typeof InferenceInferenceEndpointInfoAnthropic>

/**
 * Create an Anthropic inference endpoint.
 *
 * Create an inference endpoint to perform an inference task with the `anthropic` service.
 */
export const InferencePutAnthropicRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceAnthropicTaskType.describe('The task type. The only valid task type for the model to perform is `completion`.').meta({ found_in: 'path' }),
  anthropic_inference_id: Id.describe('The unique identifier of the inference endpoint.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference endpoint to be created.').optional().meta({ found_in: 'query' }),
  service: InferenceAnthropicServiceType.describe('The type of service supported for the specified task type. In this case, `anthropic`.').meta({ found_in: 'body' }),
  service_settings: InferenceAnthropicServiceSettings.describe('Settings used to install the inference model. These settings are specific to the `anthropic` service.').meta({ found_in: 'body' }),
  task_settings: InferenceAnthropicTaskSettings.describe('Settings to configure the inference task. These settings are specific to the task type you specified.').optional().meta({ found_in: 'body' })
}).meta({ id: 'InferencePutAnthropicRequest' })
export type InferencePutAnthropicRequest = z.infer<typeof InferencePutAnthropicRequest>

export const InferencePutAnthropicResponse = InferenceInferenceEndpointInfoAnthropic.meta({ id: 'InferencePutAnthropicResponse' })
export type InferencePutAnthropicResponse = z.infer<typeof InferencePutAnthropicResponse>
