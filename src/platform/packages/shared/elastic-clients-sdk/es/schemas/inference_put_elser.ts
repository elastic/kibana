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

export const InferenceAdaptiveAllocations = z.object({
  enabled: z.boolean().describe('Turn on `adaptive_allocations`.').optional(),
  max_number_of_allocations: integer.describe('The maximum number of allocations to scale to. If set, it must be greater than or equal to `min_number_of_allocations`.').optional(),
  min_number_of_allocations: integer.describe('The minimum number of allocations to scale to. If set, it must be greater than or equal to 0. If not defined, the deployment scales to 0.').optional()
}).meta({ id: 'InferenceAdaptiveAllocations' })
export type InferenceAdaptiveAllocations = z.infer<typeof InferenceAdaptiveAllocations>

export const InferenceElserServiceSettings = z.object({
  adaptive_allocations: InferenceAdaptiveAllocations.describe('Adaptive allocations configuration details. If `enabled` is true, the number of allocations of the model is set based on the current load the process gets. When the load is high, a new model allocation is automatically created, respecting the value of `max_number_of_allocations` if it\'s set. When the load is low, a model allocation is automatically removed, respecting the value of `min_number_of_allocations` if it\'s set. If `enabled` is true, do not set the number of allocations manually.').optional(),
  num_allocations: integer.describe('The total number of allocations this model is assigned across machine learning nodes. Increasing this value generally increases the throughput. If adaptive allocations is enabled, do not set this value because it\'s automatically set.'),
  num_threads: integer.describe('The number of threads used by each model allocation during inference. Increasing this value generally increases the speed per inference request. The inference process is a compute-bound process; `threads_per_allocations` must not exceed the number of available allocated processors per node. The value must be a power of 2. The maximum value is 32. > info > If you want to optimize your ELSER endpoint for ingest, set the number of threads to 1. If you want to optimize your ELSER endpoint for search, set the number of threads to greater than 1.')
}).meta({ id: 'InferenceElserServiceSettings' })
export type InferenceElserServiceSettings = z.infer<typeof InferenceElserServiceSettings>

export const InferenceElserServiceType = z.enum(['elser']).meta({ id: 'InferenceElserServiceType' })
export type InferenceElserServiceType = z.infer<typeof InferenceElserServiceType>

export const InferenceElserTaskType = z.enum(['sparse_embedding']).meta({ id: 'InferenceElserTaskType' })
export type InferenceElserTaskType = z.infer<typeof InferenceElserTaskType>

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

export const InferenceTaskTypeELSER = z.enum(['sparse_embedding']).meta({ id: 'InferenceTaskTypeELSER' })
export type InferenceTaskTypeELSER = z.infer<typeof InferenceTaskTypeELSER>

export const InferenceInferenceEndpointInfoELSER = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeELSER.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoELSER' })
export type InferenceInferenceEndpointInfoELSER = z.infer<typeof InferenceInferenceEndpointInfoELSER>

/**
 * Create an ELSER inference endpoint.
 *
 * Create an inference endpoint to perform an inference task with the `elser` service.
 * You can also deploy ELSER by using the Elasticsearch inference integration.
 *
 * > info
 * > Your Elasticsearch deployment contains a preconfigured ELSER inference endpoint, you only need to create the enpoint using the API if you want to customize the settings.
 *
 * The API request will automatically download and deploy the ELSER model if it isn't already downloaded.
 *
 * > info
 * > You might see a 502 bad gateway error in the response when using the Kibana Console. This error usually just reflects a timeout, while the model downloads in the background. You can check the download progress in the Machine Learning UI. If using the Python client, you can set the timeout parameter to a higher value.
 *
 * After creating the endpoint, wait for the model deployment to complete before using it.
 * To verify the deployment status, use the get trained model statistics API.
 * Look for `"state": "fully_allocated"` in the response and ensure that the `"allocation_count"` matches the `"target_allocation_count"`.
 * Avoid creating multiple endpoints for the same model unless required, as each endpoint consumes significant resources.
 * @deprecated The elser service is deprecated and will be removed in a future release. Use the Elasticsearch inference integration instead, with model_id included in the service_settings.
 */
export const InferencePutElserRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceElserTaskType.describe('The type of the inference task that the model will perform.').meta({ found_in: 'path' }),
  elser_inference_id: Id.describe('The unique identifier of the inference endpoint.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference endpoint to be created.').optional().meta({ found_in: 'query' }),
  chunking_settings: InferenceInferenceChunkingSettings.describe('The chunking configuration object. Note that for ELSER endpoints, the max_chunk_size may not exceed `300`.').optional().meta({ found_in: 'body' }),
  service: InferenceElserServiceType.describe('The type of service supported for the specified task type. In this case, `elser`.').meta({ found_in: 'body' }),
  service_settings: InferenceElserServiceSettings.describe('Settings used to install the inference model. These settings are specific to the `elser` service.').meta({ found_in: 'body' })
}).meta({ id: 'InferencePutElserRequest' })
export type InferencePutElserRequest = z.infer<typeof InferencePutElserRequest>

export const InferencePutElserResponse = InferenceInferenceEndpointInfoELSER.meta({ id: 'InferencePutElserResponse' })
export type InferencePutElserResponse = z.infer<typeof InferencePutElserResponse>
