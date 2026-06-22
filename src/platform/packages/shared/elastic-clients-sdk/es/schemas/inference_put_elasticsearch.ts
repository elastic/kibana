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

export const InferenceElasticsearchServiceSettings = z.object({
  adaptive_allocations: InferenceAdaptiveAllocations.describe('Adaptive allocations configuration details. If `enabled` is true, the number of allocations of the model is set based on the current load the process gets. When the load is high, a new model allocation is automatically created, respecting the value of `max_number_of_allocations` if it\'s set. When the load is low, a model allocation is automatically removed, respecting the value of `min_number_of_allocations` if it\'s set. If `enabled` is true, do not set the number of allocations manually.').optional(),
  deployment_id: z.string().describe('The deployment identifier for a trained model deployment. When `deployment_id` is used the `model_id` is optional.').optional(),
  model_id: z.string().describe('The name of the model to use for the inference task. It can be the ID of a built-in model (for example, `.multilingual-e5-small` for E5) or a text embedding model that was uploaded by using the Eland client.'),
  num_allocations: integer.describe('The total number of allocations that are assigned to the model across machine learning nodes. Increasing this value generally increases the throughput. If adaptive allocations are enabled, do not set this value because it\'s automatically set.').optional(),
  num_threads: integer.describe('The number of threads used by each model allocation during inference. This setting generally increases the speed per inference request. The inference process is a compute-bound process; `threads_per_allocations` must not exceed the number of available allocated processors per node. The value must be a power of 2. The maximum value is 32.'),
  long_document_strategy: z.string().describe('Available only for the `rerank` task type using the Elastic reranker model. Controls the strategy used for processing long documents during inference. Possible values: - `truncate` (default): Processes only the beginning of each document. - `chunk`: Splits long documents into smaller parts (chunks) before inference. When `long_document_strategy` is set to `chunk`, Elasticsearch splits each document into smaller parts but still returns a single score per document. That score reflects the highest relevance score among all chunks.').optional(),
  max_chunks_per_doc: integer.describe('Only for the `rerank` task type. Limits the number of chunks per document that are sent for inference when chunking is enabled. If not set, all chunks generated for the document are processed.').optional()
}).meta({ id: 'InferenceElasticsearchServiceSettings' })
export type InferenceElasticsearchServiceSettings = z.infer<typeof InferenceElasticsearchServiceSettings>

export const InferenceElasticsearchServiceType = z.enum(['elasticsearch']).meta({ id: 'InferenceElasticsearchServiceType' })
export type InferenceElasticsearchServiceType = z.infer<typeof InferenceElasticsearchServiceType>

export const InferenceElasticsearchTaskSettings = z.object({
  return_documents: z.boolean().describe('For a `rerank` task, return the document instead of only the index.').optional()
}).meta({ id: 'InferenceElasticsearchTaskSettings' })
export type InferenceElasticsearchTaskSettings = z.infer<typeof InferenceElasticsearchTaskSettings>

export const InferenceElasticsearchTaskType = z.enum(['rerank', 'sparse_embedding', 'text_embedding']).meta({ id: 'InferenceElasticsearchTaskType' })
export type InferenceElasticsearchTaskType = z.infer<typeof InferenceElasticsearchTaskType>

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

export const InferenceTaskTypeElasticsearch = z.enum(['sparse_embedding', 'text_embedding', 'rerank']).meta({ id: 'InferenceTaskTypeElasticsearch' })
export type InferenceTaskTypeElasticsearch = z.infer<typeof InferenceTaskTypeElasticsearch>

export const InferenceInferenceEndpointInfoElasticsearch = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeElasticsearch.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoElasticsearch' })
export type InferenceInferenceEndpointInfoElasticsearch = z.infer<typeof InferenceInferenceEndpointInfoElasticsearch>

/**
 * Create an Elasticsearch inference endpoint.
 *
 * Create an inference endpoint to perform an inference task with the `elasticsearch` service.
 *
 * > info
 * > Your Elasticsearch deployment contains preconfigured ELSER and E5 inference endpoints, you only need to create the enpoints using the API if you want to customize the settings.
 *
 * If you use the ELSER or the E5 model through the `elasticsearch` service, the API request will automatically download and deploy the model if it isn't downloaded yet.
 *
 * > info
 * > You might see a 502 bad gateway error in the response when using the Kibana Console. This error usually just reflects a timeout, while the model downloads in the background. You can check the download progress in the Machine Learning UI. If using the Python client, you can set the timeout parameter to a higher value.
 *
 * After creating the endpoint, wait for the model deployment to complete before using it.
 * To verify the deployment status, use the get trained model statistics API.
 * Look for `"state": "fully_allocated"` in the response and ensure that the `"allocation_count"` matches the `"target_allocation_count"`.
 * Avoid creating multiple endpoints for the same model unless required, as each endpoint consumes significant resources.
 */
export const InferencePutElasticsearchRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceElasticsearchTaskType.describe('The type of the inference task that the model will perform.').meta({ found_in: 'path' }),
  elasticsearch_inference_id: Id.describe('The unique identifier of the inference endpoint. The must not match the `model_id`.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference endpoint to be created.').optional().meta({ found_in: 'query' }),
  chunking_settings: InferenceInferenceChunkingSettings.describe('The chunking configuration object. Applies only to the `sparse_embedding` and `text_embedding` task types. Not applicable to the `rerank` task type.').optional().meta({ found_in: 'body' }),
  service: InferenceElasticsearchServiceType.describe('The type of service supported for the specified task type. In this case, `elasticsearch`.').meta({ found_in: 'body' }),
  service_settings: InferenceElasticsearchServiceSettings.describe('Settings used to install the inference model. These settings are specific to the `elasticsearch` service.').meta({ found_in: 'body' }),
  task_settings: InferenceElasticsearchTaskSettings.describe('Settings to configure the inference task. These settings are specific to the task type you specified.').optional().meta({ found_in: 'body' })
}).meta({ id: 'InferencePutElasticsearchRequest' })
export type InferencePutElasticsearchRequest = z.infer<typeof InferencePutElasticsearchRequest>

export const InferencePutElasticsearchResponse = InferenceInferenceEndpointInfoElasticsearch.meta({ id: 'InferencePutElasticsearchResponse' })
export type InferencePutElasticsearchResponse = z.infer<typeof InferencePutElasticsearchResponse>
