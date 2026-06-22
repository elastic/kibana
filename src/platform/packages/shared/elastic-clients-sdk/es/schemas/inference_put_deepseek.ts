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

export const InferenceDeepSeekServiceSettings = z.object({
  api_key: z.string().describe('A valid API key for your DeepSeek account. You can find or create your DeepSeek API keys on the DeepSeek API key page. IMPORTANT: You need to provide the API key only once, during the inference model creation. The get inference endpoint API does not retrieve your API key.'),
  model_id: z.string().describe('For a `completion` or `chat_completion` task, the name of the model to use for the inference task. For the available `completion` and `chat_completion` models, refer to the [DeepSeek Models & Pricing docs](https://api-docs.deepseek.com/quick_start/pricing).'),
  url: z.string().describe('The URL endpoint to use for the requests. Defaults to `https://api.deepseek.com/chat/completions`.').optional()
}).meta({ id: 'InferenceDeepSeekServiceSettings' })
export type InferenceDeepSeekServiceSettings = z.infer<typeof InferenceDeepSeekServiceSettings>

export const InferenceDeepSeekServiceType = z.enum(['deepseek']).meta({ id: 'InferenceDeepSeekServiceType' })
export type InferenceDeepSeekServiceType = z.infer<typeof InferenceDeepSeekServiceType>

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

export const InferenceTaskTypeDeepSeek = z.enum(['completion', 'chat_completion']).meta({ id: 'InferenceTaskTypeDeepSeek' })
export type InferenceTaskTypeDeepSeek = z.infer<typeof InferenceTaskTypeDeepSeek>

export const InferenceInferenceEndpointInfoDeepSeek = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeDeepSeek.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoDeepSeek' })
export type InferenceInferenceEndpointInfoDeepSeek = z.infer<typeof InferenceInferenceEndpointInfoDeepSeek>

/**
 * Create a DeepSeek inference endpoint.
 *
 * Create an inference endpoint to perform an inference task with the `deepseek` service.
 */
export const InferencePutDeepseekRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceTaskTypeDeepSeek.describe('The type of the inference task that the model will perform.').meta({ found_in: 'path' }),
  deepseek_inference_id: Id.describe('The unique identifier of the inference endpoint.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference endpoint to be created.').optional().meta({ found_in: 'query' }),
  service: InferenceDeepSeekServiceType.describe('The type of service supported for the specified task type. In this case, `deepseek`.').meta({ found_in: 'body' }),
  service_settings: InferenceDeepSeekServiceSettings.describe('Settings used to install the inference model. These settings are specific to the `deepseek` service.').meta({ found_in: 'body' })
}).meta({ id: 'InferencePutDeepseekRequest' })
export type InferencePutDeepseekRequest = z.infer<typeof InferencePutDeepseekRequest>

export const InferencePutDeepseekResponse = InferenceInferenceEndpointInfoDeepSeek.meta({ id: 'InferencePutDeepseekResponse' })
export type InferencePutDeepseekResponse = z.infer<typeof InferencePutDeepseekResponse>
