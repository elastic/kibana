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

export const InferenceTaskTypeJinaAi = z.enum(['embedding', 'text_embedding', 'rerank']).meta({ id: 'InferenceTaskTypeJinaAi' })
export type InferenceTaskTypeJinaAi = z.infer<typeof InferenceTaskTypeJinaAi>

export const InferenceInferenceEndpointInfoJinaAi = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeJinaAi.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoJinaAi' })
export type InferenceInferenceEndpointInfoJinaAi = z.infer<typeof InferenceInferenceEndpointInfoJinaAi>

export const InferenceJinaAIElementType = z.enum(['binary', 'bit', 'float']).meta({ id: 'InferenceJinaAIElementType' })
export type InferenceJinaAIElementType = z.infer<typeof InferenceJinaAIElementType>

/** This setting helps to minimize the number of rate limit errors returned from the service. */
export const InferenceRateLimitSetting = z.object({
  requests_per_minute: integer.describe('The number of requests allowed per minute. By default, the number of requests allowed per minute is set by each service as follows: * `alibabacloud-ai-search` service: `1000` * `amazonbedrock` service: `240` * `anthropic` service: `50` * `azureaistudio` service: `240` * `azureopenai` service and task type `text_embedding`: `1440` * `azureopenai` service and task types `completion` or `chat_completion`: `120` * `cohere` service: `10000` * `contextualai` service: `1000` * `elastic` service and task type `chat_completion`: `240` * `fireworksai` service: `6000` * `googleaistudio` service: `360` * `googlevertexai` service: `30000` * `hugging_face` service: `3000` * `jinaai` service: `2000` * `llama` service: `3000` * `mistral` service: `240` * `openai` service and task type `text_embedding`: `3000` * `openai` service and task type `completion`: `500` * `openshift_ai` service: `3000` * `voyageai` service: `2000` * `watsonxai` service: `120`').optional()
}).meta({ id: 'InferenceRateLimitSetting' })
export type InferenceRateLimitSetting = z.infer<typeof InferenceRateLimitSetting>

export const InferenceJinaAISimilarityType = z.enum(['cosine', 'dot_product', 'l2_norm']).meta({ id: 'InferenceJinaAISimilarityType' })
export type InferenceJinaAISimilarityType = z.infer<typeof InferenceJinaAISimilarityType>

export const InferenceJinaAIServiceSettings = z.object({
  api_key: z.string().describe('A valid API key of your JinaAI account. IMPORTANT: You need to provide the API key only once, during the inference model creation. The get inference endpoint API does not retrieve your API key.'),
  model_id: z.string().describe('The name of the model to use for the inference task.'),
  rate_limit: InferenceRateLimitSetting.describe('This setting helps to minimize the number of rate limit errors returned from JinaAI. By default, the `jinaai` service sets the number of requests allowed per minute to 2000 for all task types.').optional(),
  similarity: InferenceJinaAISimilarityType.describe('For an `embedding` or `text_embedding` task, the similarity measure. One of cosine, dot_product, l2_norm. The default values varies with the embedding type. For example, a float embedding type uses a `dot_product` similarity measure by default.').optional(),
  dimensions: integer.describe('For an `embedding` or `text_embedding` task, the number of dimensions the resulting output embeddings should have. By default, the model\'s standard output dimension is used. Refer to the Jina documentation for more information.').optional(),
  element_type: InferenceJinaAIElementType.describe('For an `embedding` or `text_embedding` task, the data type returned by the model. Use `bit` for binary embeddings, which are encoded as bytes with signed int8 precision. Use `binary` for binary embeddings, which are encoded as bytes with signed int8 precision (this is a synonym of `bit`). Use `float` for the default float embeddings.').optional(),
  multimodal_model: z.boolean().describe('For the `embedding` task, whether the model supports multimodal inputs. If true, requests sent to the Jina model will use the multimodal request format (a list of objects). If false, requests sent to the model will use the same format as the `text_embedding` task (a list of strings). Setting this to `false` allows the `embedding` task to be used with models that do not support multimodal requests.').optional()
}).meta({ id: 'InferenceJinaAIServiceSettings' })
export type InferenceJinaAIServiceSettings = z.infer<typeof InferenceJinaAIServiceSettings>

export const InferenceJinaAIServiceType = z.enum(['jinaai']).meta({ id: 'InferenceJinaAIServiceType' })
export type InferenceJinaAIServiceType = z.infer<typeof InferenceJinaAIServiceType>

export const InferenceJinaAITextEmbeddingTask = z.enum(['classification', 'clustering', 'ingest', 'search']).meta({ id: 'InferenceJinaAITextEmbeddingTask' })
export type InferenceJinaAITextEmbeddingTask = z.infer<typeof InferenceJinaAITextEmbeddingTask>

export const InferenceJinaAITaskSettings = z.object({
  return_documents: z.boolean().describe('For a `rerank` task, return the doc text within the results.').optional(),
  input_type: InferenceJinaAITextEmbeddingTask.describe('For an `embedding` or `text_embedding` task, the task passed to the model. Valid values are: * `classification`: Use it for embeddings passed through a classifier. * `clustering`: Use it for the embeddings run through a clustering algorithm. * `ingest`: Use it for storing document embeddings in a vector database. * `search`: Use it for storing embeddings of search queries run against a vector database to find relevant documents.').optional(),
  late_chunking: z.boolean().describe('For an `embedding` or `text_embedding` task, controls when text is split into chunks. When set to `true`, a request from Elasticsearch contains only chunks related to a single document. Instead of batching chunks across documents, Elasticsearch sends them in separate requests. This ensures that chunk embeddings retain context from the entire document, improving semantic quality. If a document exceeds the model\'s context limits, or if the document contains non-text inputs (relevant when using the multimodal `embedding` task), late chunking is automatically disabled for that document only and standard chunking is used instead. If not specified, defaults to `false`.').optional(),
  top_n: integer.describe('For a `rerank` task, the number of most relevant documents to return. It defaults to the number of the documents. If this inference endpoint is used in a `text_similarity_reranker` retriever query and `top_n` is set, it must be greater than or equal to `rank_window_size` in the query.').optional()
}).meta({ id: 'InferenceJinaAITaskSettings' })
export type InferenceJinaAITaskSettings = z.infer<typeof InferenceJinaAITaskSettings>

export const InferenceJinaAITaskType = z.enum(['embedding', 'rerank', 'text_embedding']).meta({ id: 'InferenceJinaAITaskType' })
export type InferenceJinaAITaskType = z.infer<typeof InferenceJinaAITaskType>

/**
 * Create an JinaAI inference endpoint.
 *
 * Create an inference endpoint to perform an inference task with the `jinaai` service.
 *
 * To review the available `rerank` models, refer to <https://jina.ai/reranker>.
 * To review the available `embedding` and `text_embedding` models, refer to <https://jina.ai/embeddings/>.
 */
export const InferencePutJinaaiRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceJinaAITaskType.describe('The type of the inference task that the model will perform.').meta({ found_in: 'path' }),
  jinaai_inference_id: Id.describe('The unique identifier of the inference endpoint.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference endpoint to be created.').optional().meta({ found_in: 'query' }),
  chunking_settings: InferenceInferenceChunkingSettings.describe('The chunking configuration object. Applies only to the `embedding` and text_embedding` task types. Not applicable to the `rerank` task type.').optional().meta({ found_in: 'body' }),
  service: InferenceJinaAIServiceType.describe('The type of service supported for the specified task type. In this case, `jinaai`.').meta({ found_in: 'body' }),
  service_settings: InferenceJinaAIServiceSettings.describe('Settings used to install the inference model. These settings are specific to the `jinaai` service.').meta({ found_in: 'body' }),
  task_settings: InferenceJinaAITaskSettings.describe('Settings to configure the inference task. These settings are specific to the task type you specified.').optional().meta({ found_in: 'body' })
}).meta({ id: 'InferencePutJinaaiRequest' })
export type InferencePutJinaaiRequest = z.infer<typeof InferencePutJinaaiRequest>

export const InferencePutJinaaiResponse = InferenceInferenceEndpointInfoJinaAi.meta({ id: 'InferencePutJinaaiResponse' })
export type InferencePutJinaaiResponse = z.infer<typeof InferencePutJinaaiResponse>
