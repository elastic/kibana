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

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const double = z.number().meta({ id: 'double' })
export type double = z.infer<typeof double>

export const float = z.number().meta({ id: 'float' })
export type float = z.infer<typeof float>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const InferenceCustomRequestParams = z.object({
  content: z.string().describe('The body structure of the request. It requires passing in the string-escaped result of the JSON format HTTP request body. For example: ``` "request": "{"input":{input}}" ``` > info > The content string needs to be a single line except when using the Kibana console.')
}).meta({ id: 'InferenceCustomRequestParams' })
export type InferenceCustomRequestParams = z.infer<typeof InferenceCustomRequestParams>

export const InferenceCustomResponseParams = z.object({
  json_parser: z.record(z.string(), z.string()).describe('Specifies the JSON parser that is used to parse the response from the custom service. Different task types require different json_parser parameters. For example: ``` # text_embedding # For a response like this: {  "object": "list",  "data": [      {        "object": "embedding",        "index": 0,        "embedding": [            0.014539449,            -0.015288644        ]      }  ],  "model": "text-embedding-ada-002-v2",  "usage": {      "prompt_tokens": 8,      "total_tokens": 8  } } # the json_parser definition should look like this: "response":{   "json_parser":{     "text_embeddings":"$.data[*].embedding[*]"   } } # Elasticsearch supports the following embedding types: * float * byte * bit (or binary) To specify the embedding type for the response, the `embedding_type` field should be added in the `json_parser` object. Here\'s an example: "response":{   "json_parser":{     "text_embeddings":"$.data[*].embedding[*]",     "embedding_type":"bit"   } } If `embedding_type` is not specified, it defaults to `float`. # sparse_embedding # For a response like this: {   "request_id": "75C50B5B-E79E-4930-****-F48DBB392231",   "latency": 22,   "usage": {      "token_count": 11   },   "result": {      "sparse_embeddings": [         {           "index": 0,           "embedding": [             {               "token_id": 6,               "weight": 0.101             },             {               "token_id": 163040,               "weight": 0.28417             }           ]         }      ]   } } # the json_parser definition should look like this: "response":{   "json_parser":{     "token_path":"$.result.sparse_embeddings[*].embedding[*].token_id",     "weight_path":"$.result.sparse_embeddings[*].embedding[*].weight"   } } # rerank # For a response like this: {   "results": [     {       "index": 3,       "relevance_score": 0.999071,       "document": "abc"     },     {       "index": 4,       "relevance_score": 0.7867867,       "document": "123"     },     {       "index": 0,       "relevance_score": 0.32713068,       "document": "super"     }   ], } # the json_parser definition should look like this: "response":{   "json_parser":{     "reranked_index":"$.result.scores[*].index",    // optional     "relevance_score":"$.result.scores[*].score",     "document_text":"xxx"    // optional   } } # completion # For a response like this: {  "id": "chatcmpl-B9MBs8CjcvOU2jLn4n570S5qMJKcT",  "object": "chat.completion",  "created": 1741569952,  "model": "gpt-4.1-2025-04-14",  "choices": [    {     "index": 0,     "message": {       "role": "assistant",       "content": "Hello! How can I assist you today?",       "refusal": null,       "annotations": []     },     "logprobs": null,     "finish_reason": "stop"   }  ] } # the json_parser definition should look like this: "response":{   "json_parser":{     "completion_result":"$.choices[*].message.content"   } }')
}).meta({ id: 'InferenceCustomResponseParams' })
export type InferenceCustomResponseParams = z.infer<typeof InferenceCustomResponseParams>

export const InferenceCustomServiceInputType = z.enum(['classification', 'clustering', 'ingest', 'search']).meta({ id: 'InferenceCustomServiceInputType' })
export type InferenceCustomServiceInputType = z.infer<typeof InferenceCustomServiceInputType>

export const InferenceCustomServiceQueryParameter = z.array(z.string()).meta({ id: 'InferenceCustomServiceQueryParameter' })
export type InferenceCustomServiceQueryParameter = z.infer<typeof InferenceCustomServiceQueryParameter>

export const InferenceCustomServiceSettings = z.object({
  batch_size: integer.describe('Specifies the batch size used for the semantic_text field. If the field is not provided, the default is 10. The batch size is the maximum number of inputs in a single request to the upstream service. The chunk within the batch are controlled by the selected chunking strategy for the semantic_text field.').optional(),
  headers: z.record(z.string(), z.string()).describe('Specifies the HTTP header parameters – such as `Authentication` or `Content-Type` – that are required to access the custom service. For example: ``` "headers": {   "Authorization": "Bearer {api_key}",   "Content-Type": "application/json;charset=utf-8" } ```').optional(),
  input_type: z.record(InferenceCustomServiceInputType, z.string()).describe('Specifies the input type translation values that are used to replace the `{input_type}` template in the request body. For example: ``` "input_type": {   "translation": {     "ingest": "do_ingest",     "search": "do_search"   },   "default": "a_default" }, ``` If the subsequent inference requests come from a search context, the `search` key will be used and the template will be replaced with `do_search`. If it comes from the ingest context `do_ingest` is used. If it\'s a different context that is not specified, the default value will be used. If no default is specified an empty string is used. `translation` can be: * `classification` * `clustering` * `ingest` * `search`').optional(),
  query_parameters: z.array(InferenceCustomServiceQueryParameter).describe('Specifies the query parameters as a list of tuples. The arrays inside the `query_parameters` must have two items, a key and a value. For example: ``` "query_parameters":[   ["param_key", "some_value"],   ["param_key", "another_value"],   ["other_key", "other_value"] ] ``` If the base url is `https://www.elastic.co` it results in: `https://www.elastic.co?param_key=some_value&param_key=another_value&other_key=other_value`.').optional(),
  request: InferenceCustomRequestParams.describe('The request configuration object.'),
  response: InferenceCustomResponseParams.describe('The response configuration object.'),
  secret_parameters: z.record(z.string(), z.string()).describe('Specifies secret parameters, like `api_key` or `api_token`, that are required to access the custom service. For example: ``` "secret_parameters":{   "api_key":"<api_key>" } ```'),
  url: z.string().describe('The URL endpoint to use for the requests.').optional()
}).meta({ id: 'InferenceCustomServiceSettings' })
export type InferenceCustomServiceSettings = z.infer<typeof InferenceCustomServiceSettings>

export const InferenceCustomServiceType = z.enum(['custom']).meta({ id: 'InferenceCustomServiceType' })
export type InferenceCustomServiceType = z.infer<typeof InferenceCustomServiceType>

export const InferenceCustomTaskParameter = z.union([z.string(), integer, double, float, z.boolean()]).meta({ id: 'InferenceCustomTaskParameter' })
export type InferenceCustomTaskParameter = z.infer<typeof InferenceCustomTaskParameter>

export const InferenceCustomTaskSettings = z.object({
  parameters: z.record(z.string(), InferenceCustomTaskParameter).describe('Specifies parameters that are required to run the custom service. The parameters depend on the model your custom service uses. For example: ``` "task_settings":{   "parameters":{     "input_type":"query",     "return_token":true   } } ```').optional()
}).meta({ id: 'InferenceCustomTaskSettings' })
export type InferenceCustomTaskSettings = z.infer<typeof InferenceCustomTaskSettings>

export const InferenceCustomTaskType = z.enum(['text_embedding', 'sparse_embedding', 'rerank', 'completion']).meta({ id: 'InferenceCustomTaskType' })
export type InferenceCustomTaskType = z.infer<typeof InferenceCustomTaskType>

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

export const InferenceTaskTypeCustom = z.enum(['text_embedding', 'sparse_embedding', 'rerank', 'completion']).meta({ id: 'InferenceTaskTypeCustom' })
export type InferenceTaskTypeCustom = z.infer<typeof InferenceTaskTypeCustom>

export const InferenceInferenceEndpointInfoCustom = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeCustom.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoCustom' })
export type InferenceInferenceEndpointInfoCustom = z.infer<typeof InferenceInferenceEndpointInfoCustom>

/**
 * Create a custom inference endpoint.
 *
 * The custom service gives more control over how to interact with external inference services that aren't explicitly supported through dedicated integrations.
 * The custom service gives you the ability to define the headers, url, query parameters, request body, and secrets.
 * The custom service supports the template replacement functionality, which enables you to define a template that can be replaced with the value associated with that key.
 * Templates are portions of a string that start with `${` and end with `}`.
 * The parameters `secret_parameters` and `task_settings` are checked for keys for template replacement. Template replacement is supported in the `request`, `headers`, `url`, and `query_parameters`.
 * If the definition (key) is not found for a template, an error message is returned.
 * In case of an endpoint definition like the following:
 * ```
 * PUT _inference/text_embedding/test-text-embedding
 * {
 *   "service": "custom",
 *   "service_settings": {
 *      "secret_parameters": {
 *           "api_key": "<some api key>"
 *      },
 *      "url": "...endpoints.huggingface.cloud/v1/embeddings",
 *      "headers": {
 *          "Authorization": "Bearer ${api_key}",
 *          "Content-Type": "application/json"
 *      },
 *      "request": "{\"input\": ${input}}",
 *      "response": {
 *          "json_parser": {
 *              "text_embeddings":"$.data[*].embedding[*]"
 *          }
 *      }
 *   }
 * }
 * ```
 * To replace `${api_key}` the `secret_parameters` and `task_settings` are checked for a key named `api_key`.
 *
 * > info
 * > Templates should not be surrounded by quotes.
 *
 * Pre-defined templates:
 * * `${input}` refers to the array of input strings that comes from the `input` field of the subsequent inference requests.
 * * `${input_type}` refers to the input type translation values.
 * * `${query}` refers to the query field used specifically for reranking tasks.
 * * `${top_n}` refers to the `top_n` field available when performing rerank requests.
 * * `${return_documents}` refers to the `return_documents` field available when performing rerank requests.
 */
export const InferencePutCustomRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceCustomTaskType.describe('The type of the inference task that the model will perform.').meta({ found_in: 'path' }),
  custom_inference_id: Id.describe('The unique identifier of the inference endpoint.').meta({ found_in: 'path' }),
  chunking_settings: InferenceInferenceChunkingSettings.describe('The chunking configuration object. Applies only to the `sparse_embedding` or `text_embedding` task types. Not applicable to the `rerank` or `completion` task types.').optional().meta({ found_in: 'body' }),
  service: InferenceCustomServiceType.describe('The type of service supported for the specified task type. In this case, `custom`.').meta({ found_in: 'body' }),
  service_settings: InferenceCustomServiceSettings.describe('Settings used to install the inference model. These settings are specific to the `custom` service.').meta({ found_in: 'body' }),
  task_settings: InferenceCustomTaskSettings.describe('Settings to configure the inference task. These settings are specific to the task type you specified.').optional().meta({ found_in: 'body' })
}).meta({ id: 'InferencePutCustomRequest' })
export type InferencePutCustomRequest = z.infer<typeof InferencePutCustomRequest>

export const InferencePutCustomResponse = InferenceInferenceEndpointInfoCustom.meta({ id: 'InferencePutCustomResponse' })
export type InferencePutCustomResponse = z.infer<typeof InferencePutCustomResponse>
