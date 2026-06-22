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

export const InferenceAmazonSageMakerApi = z.enum(['openai', 'elastic']).meta({ id: 'InferenceAmazonSageMakerApi' })
export type InferenceAmazonSageMakerApi = z.infer<typeof InferenceAmazonSageMakerApi>

export const InferenceAmazonSageMakerElementType = z.enum(['byte', 'float', 'bit']).meta({ id: 'InferenceAmazonSageMakerElementType' })
export type InferenceAmazonSageMakerElementType = z.infer<typeof InferenceAmazonSageMakerElementType>

export const InferenceAmazonSageMakerSimilarity = z.enum(['cosine', 'dot_product', 'l2_norm']).meta({ id: 'InferenceAmazonSageMakerSimilarity' })
export type InferenceAmazonSageMakerSimilarity = z.infer<typeof InferenceAmazonSageMakerSimilarity>

export const InferenceAmazonSageMakerServiceSettings = z.object({
  access_key: z.string().describe('A valid AWS access key that has permissions to use Amazon SageMaker and access to models for invoking requests.'),
  endpoint_name: z.string().describe('The name of the SageMaker endpoint.'),
  api: InferenceAmazonSageMakerApi.describe('The API format to use when calling SageMaker. Elasticsearch will convert the POST _inference request to this data format when invoking the SageMaker endpoint.'),
  region: z.string().describe('The region that your endpoint or Amazon Resource Name (ARN) is deployed in. The list of available regions per model can be found in the Amazon SageMaker documentation.'),
  secret_key: z.string().describe('A valid AWS secret key that is paired with the `access_key`. For information about creating and managing access and secret keys, refer to the AWS documentation.'),
  similarity: InferenceAmazonSageMakerSimilarity.describe('Required when `api` is `elastic` and task type is `text_embedding`. The similarity measure used when invoking the `text_embedding` task type.').optional(),
  element_type: InferenceAmazonSageMakerElementType.describe('Required when `api` is `elastic` and task type is `text_embedding`. The data type returned by the text embedding model. This value is used when parsing the response back to Elasticsearch data structures.').optional(),
  target_model: z.string().describe('The model ID when calling a multi-model endpoint.').optional(),
  target_container_hostname: z.string().describe('The container to directly invoke when calling a multi-container endpoint.').optional(),
  inference_component_name: z.string().describe('The inference component to directly invoke when calling a multi-component endpoint.').optional(),
  batch_size: integer.describe('The maximum number of inputs in each batch. This value is used by inference ingestion pipelines when processing semantic values. It correlates to the number of times the SageMaker endpoint is invoked (one per batch of input).').optional(),
  dimensions: integer.describe('The number of dimensions returned by the text embedding models. If this value is not provided, then it is guessed by making invoking the endpoint for the `text_embedding` task.').optional()
}).meta({ id: 'InferenceAmazonSageMakerServiceSettings' })
export type InferenceAmazonSageMakerServiceSettings = z.infer<typeof InferenceAmazonSageMakerServiceSettings>

export const InferenceAmazonSageMakerServiceType = z.enum(['amazon_sagemaker']).meta({ id: 'InferenceAmazonSageMakerServiceType' })
export type InferenceAmazonSageMakerServiceType = z.infer<typeof InferenceAmazonSageMakerServiceType>

export const InferenceAmazonSageMakerTaskSettings = z.object({
  custom_attributes: z.string().describe('The AWS custom attributes passed verbatim through to the model running in the SageMaker Endpoint. Values will be returned in the `X-elastic-sagemaker-custom-attributes` header.').optional(),
  enable_explanations: z.string().describe('The optional JMESPath expression used to override the EnableExplanations provided during endpoint creation.').optional(),
  inference_id: z.string().describe('The capture data ID when enabled in the endpoint.').optional(),
  session_id: z.string().describe('The stateful session identifier for a new or existing session. New sessions will be returned in the `X-elastic-sagemaker-new-session-id` header. Closed sessions will be returned in the `X-elastic-sagemaker-closed-session-id` header.').optional(),
  target_variant: z.string().describe('Specifies the variant when running with multi-variant Endpoints.').optional()
}).meta({ id: 'InferenceAmazonSageMakerTaskSettings' })
export type InferenceAmazonSageMakerTaskSettings = z.infer<typeof InferenceAmazonSageMakerTaskSettings>

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

export const InferenceTaskTypeAmazonSageMaker = z.enum(['text_embedding', 'completion', 'chat_completion', 'sparse_embedding', 'rerank']).meta({ id: 'InferenceTaskTypeAmazonSageMaker' })
export type InferenceTaskTypeAmazonSageMaker = z.infer<typeof InferenceTaskTypeAmazonSageMaker>

export const InferenceInferenceEndpointInfoAmazonSageMaker = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeAmazonSageMaker.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoAmazonSageMaker' })
export type InferenceInferenceEndpointInfoAmazonSageMaker = z.infer<typeof InferenceInferenceEndpointInfoAmazonSageMaker>

/**
 * Create an Amazon SageMaker inference endpoint.
 *
 * Create an inference endpoint to perform an inference task with the `amazon_sagemaker` service.
 */
export const InferencePutAmazonsagemakerRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceTaskTypeAmazonSageMaker.describe('The type of the inference task that the model will perform.').meta({ found_in: 'path' }),
  amazonsagemaker_inference_id: Id.describe('The unique identifier of the inference endpoint.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference endpoint to be created.').optional().meta({ found_in: 'query' }),
  chunking_settings: InferenceInferenceChunkingSettings.describe('The chunking configuration object. Applies only to the `sparse_embedding` or `text_embedding` task types. Not applicable to the `rerank`, `completion`, or `chat_completion` task types.').optional().meta({ found_in: 'body' }),
  service: InferenceAmazonSageMakerServiceType.describe('The type of service supported for the specified task type. In this case, `amazon_sagemaker`.').meta({ found_in: 'body' }),
  service_settings: InferenceAmazonSageMakerServiceSettings.describe('Settings used to install the inference model. These settings are specific to the `amazon_sagemaker` service and `service_settings.api` you specified.').meta({ found_in: 'body' }),
  task_settings: InferenceAmazonSageMakerTaskSettings.describe('Settings to configure the inference task. These settings are specific to the task type and `service_settings.api` you specified.').optional().meta({ found_in: 'body' })
}).meta({ id: 'InferencePutAmazonsagemakerRequest' })
export type InferencePutAmazonsagemakerRequest = z.infer<typeof InferencePutAmazonsagemakerRequest>

export const InferencePutAmazonsagemakerResponse = InferenceInferenceEndpointInfoAmazonSageMaker.meta({ id: 'InferencePutAmazonsagemakerResponse' })
export type InferencePutAmazonsagemakerResponse = z.infer<typeof InferencePutAmazonsagemakerResponse>
