/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { AcknowledgedResponseBase, Duration, Id, RequestBase, StreamResult, byte, double, float, integer, long } from './_types'

export const InferenceAdaptiveAllocations = z.object({
  enabled: z.boolean().describe('Turn on `adaptive_allocations`.').optional(),
  max_number_of_allocations: integer.describe('The maximum number of allocations to scale to. If set, it must be greater than or equal to `min_number_of_allocations`.').optional(),
  min_number_of_allocations: integer.describe('The minimum number of allocations to scale to. If set, it must be greater than or equal to 0. If not defined, the deployment scales to 0.').optional()
}).meta({ id: 'InferenceAdaptiveAllocations' })
export type InferenceAdaptiveAllocations = z.infer<typeof InferenceAdaptiveAllocations>

/** This setting helps to minimize the number of rate limit errors returned from the service. */
export const InferenceRateLimitSetting = z.object({
  requests_per_minute: integer.describe('The number of requests allowed per minute. By default, the number of requests allowed per minute is set by each service as follows: * `alibabacloud-ai-search` service: `1000` * `amazonbedrock` service: `240` * `anthropic` service: `50` * `azureaistudio` service: `240` * `azureopenai` service and task type `text_embedding`: `1440` * `azureopenai` service and task types `completion` or `chat_completion`: `120` * `cohere` service: `10000` * `contextualai` service: `1000` * `elastic` service and task type `chat_completion`: `240` * `fireworksai` service: `6000` * `googleaistudio` service: `360` * `googlevertexai` service: `30000` * `hugging_face` service: `3000` * `jinaai` service: `2000` * `llama` service: `3000` * `mistral` service: `240` * `openai` service and task type `text_embedding`: `3000` * `openai` service and task type `completion`: `500` * `openshift_ai` service: `3000` * `voyageai` service: `2000` * `watsonxai` service: `120`').optional()
}).meta({ id: 'InferenceRateLimitSetting' })
export type InferenceRateLimitSetting = z.infer<typeof InferenceRateLimitSetting>

export const InferenceAi21ServiceSettings = z.object({
  model_id: z.string().describe('The name of the model to use for the inference task. Refer to the AI21 models documentation for the list of supported models and versions. Service has been tested and confirmed to be working for `completion` and `chat_completion` tasks with the following models: * `jamba-mini` * `jamba-large`'),
  api_key: z.string().describe('A valid API key for accessing AI21 API. IMPORTANT: You need to provide the API key only once, during the inference model creation. The get inference endpoint API does not retrieve your API key.').optional(),
  rate_limit: InferenceRateLimitSetting.describe('This setting helps to minimize the number of rate limit errors returned from the AI21 API. By default, the `ai21` service sets the number of requests allowed per minute to 200. Please refer to AI21 documentation for more details.').optional()
}).meta({ id: 'InferenceAi21ServiceSettings' })
export type InferenceAi21ServiceSettings = z.infer<typeof InferenceAi21ServiceSettings>

export const InferenceAi21ServiceType = z.enum(['ai21']).meta({ id: 'InferenceAi21ServiceType' })
export type InferenceAi21ServiceType = z.infer<typeof InferenceAi21ServiceType>

export const InferenceAi21TaskType = z.enum(['completion', 'chat_completion']).meta({ id: 'InferenceAi21TaskType' })
export type InferenceAi21TaskType = z.infer<typeof InferenceAi21TaskType>

export const InferenceAlibabaCloudServiceSettings = z.object({
  api_key: z.string().describe('A valid API key for the AlibabaCloud AI Search API.'),
  host: z.string().describe('The name of the host address used for the inference task. You can find the host address in the API keys section of the documentation.'),
  rate_limit: InferenceRateLimitSetting.describe('This setting helps to minimize the number of rate limit errors returned from AlibabaCloud AI Search. By default, the `alibabacloud-ai-search` service sets the number of requests allowed per minute to `1000`.').optional(),
  service_id: z.string().describe('The name of the model service to use for the inference task. The following service IDs are available for the `completion` task: * `ops-qwen-turbo` * `qwen-turbo` * `qwen-plus` * `qwen-max ÷ qwen-max-longcontext` The following service ID is available for the `rerank` task: * `ops-bge-reranker-larger` The following service ID is available for the `sparse_embedding` task: * `ops-text-sparse-embedding-001` The following service IDs are available for the `text_embedding` task: `ops-text-embedding-001` `ops-text-embedding-zh-001` `ops-text-embedding-en-001` `ops-text-embedding-002`'),
  workspace: z.string().describe('The name of the workspace used for the inference task.')
}).meta({ id: 'InferenceAlibabaCloudServiceSettings' })
export type InferenceAlibabaCloudServiceSettings = z.infer<typeof InferenceAlibabaCloudServiceSettings>

export const InferenceAlibabaCloudServiceType = z.enum(['alibabacloud-ai-search']).meta({ id: 'InferenceAlibabaCloudServiceType' })
export type InferenceAlibabaCloudServiceType = z.infer<typeof InferenceAlibabaCloudServiceType>

export const InferenceAlibabaCloudTaskSettings = z.object({
  input_type: z.string().describe('For a `sparse_embedding` or `text_embedding` task, specify the type of input passed to the model. Valid values are: * `ingest` for storing document embeddings in a vector database. * `search` for storing embeddings of search queries run against a vector database to find relevant documents.').optional(),
  return_token: z.boolean().describe('For a `sparse_embedding` task, it affects whether the token name will be returned in the response. It defaults to `false`, which means only the token ID will be returned in the response.').optional()
}).meta({ id: 'InferenceAlibabaCloudTaskSettings' })
export type InferenceAlibabaCloudTaskSettings = z.infer<typeof InferenceAlibabaCloudTaskSettings>

export const InferenceAlibabaCloudTaskType = z.enum(['completion', 'rerank', 'sparse_embedding', 'text_embedding']).meta({ id: 'InferenceAlibabaCloudTaskType' })
export type InferenceAlibabaCloudTaskType = z.infer<typeof InferenceAlibabaCloudTaskType>

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

/** The base reasoning detail that includes common fields across different types of reasoning details. */
export const InferenceBaseReasoningDetail = z.object({
  format: z.string().describe('The format of the reasoning detail.').optional(),
  id: z.string().describe('The identifier of the reasoning detail.').optional(),
  index: integer.describe('The index of the reasoning detail, which indicates its position in the sequence of reasoning details generated by the model.').optional()
}).meta({ id: 'InferenceBaseReasoningDetail' })
export type InferenceBaseReasoningDetail = z.infer<typeof InferenceBaseReasoningDetail>

export const InferenceCohereEmbeddingType = z.enum(['binary', 'bit', 'byte', 'float', 'int8']).meta({ id: 'InferenceCohereEmbeddingType' })
export type InferenceCohereEmbeddingType = z.infer<typeof InferenceCohereEmbeddingType>

export const InferenceCohereInputType = z.enum(['classification', 'clustering', 'ingest', 'search']).meta({ id: 'InferenceCohereInputType' })
export type InferenceCohereInputType = z.infer<typeof InferenceCohereInputType>

export const InferenceCohereSimilarityType = z.enum(['cosine', 'dot_product', 'l2_norm']).meta({ id: 'InferenceCohereSimilarityType' })
export type InferenceCohereSimilarityType = z.infer<typeof InferenceCohereSimilarityType>

export const InferenceCohereServiceSettings = z.object({
  api_key: z.string().describe('A valid API key for your Cohere account. You can find or create your Cohere API keys on the Cohere API key settings page. IMPORTANT: You need to provide the API key only once, during the inference model creation. The get inference endpoint API does not retrieve your API key.'),
  embedding_type: InferenceCohereEmbeddingType.describe('For a `text_embedding` task, the types of embeddings you want to get back. Use `binary` for binary embeddings, which are encoded as bytes with signed int8 precision. Use `bit` for binary embeddings, which are encoded as bytes with signed int8 precision (this is a synonym of `binary`). Use `byte` for signed int8 embeddings (this is a synonym of `int8`). Use `float` for the default float embeddings. Use `int8` for signed int8 embeddings.').optional(),
  model_id: z.string().describe('For a `completion`, `rerank`, or `text_embedding` task, the name of the model to use for the inference task. * For the available `completion` models, refer to the [Cohere command docs](https://docs.cohere.com/docs/models#command). * For the available `rerank` models, refer to the [Cohere rerank docs](https://docs.cohere.com/reference/rerank-1). * For the available `text_embedding` models, refer to [Cohere embed docs](https://docs.cohere.com/reference/embed).'),
  rate_limit: InferenceRateLimitSetting.describe('This setting helps to minimize the number of rate limit errors returned from Cohere. By default, the `cohere` service sets the number of requests allowed per minute to 10000.').optional(),
  similarity: InferenceCohereSimilarityType.describe('The similarity measure. If the `embedding_type` is `float`, the default value is `dot_product`. If the `embedding_type` is `int8` or `byte`, the default value is `cosine`.').optional()
}).meta({ id: 'InferenceCohereServiceSettings' })
export type InferenceCohereServiceSettings = z.infer<typeof InferenceCohereServiceSettings>

export const InferenceCohereServiceType = z.enum(['cohere']).meta({ id: 'InferenceCohereServiceType' })
export type InferenceCohereServiceType = z.infer<typeof InferenceCohereServiceType>

export const InferenceCohereTruncateType = z.enum(['END', 'NONE', 'START']).meta({ id: 'InferenceCohereTruncateType' })
export type InferenceCohereTruncateType = z.infer<typeof InferenceCohereTruncateType>

export const InferenceCohereTaskSettings = z.object({
  input_type: InferenceCohereInputType.describe('For a `text_embedding` task, the type of input passed to the model. Valid values are: * `classification`: Use it for embeddings passed through a text classifier. * `clustering`: Use it for the embeddings run through a clustering algorithm. * `ingest`: Use it for storing document embeddings in a vector database. * `search`: Use it for storing embeddings of search queries run against a vector database to find relevant documents. IMPORTANT: The `input_type` field is required when using embedding models `v3` and higher.'),
  return_documents: z.boolean().describe('For a `rerank` task, return doc text within the results.').optional(),
  top_n: integer.describe('For a `rerank` task, the number of most relevant documents to return. It defaults to the number of the documents. If this inference endpoint is used in a `text_similarity_reranker` retriever query and `top_n` is set, it must be greater than or equal to `rank_window_size` in the query.').optional(),
  truncate: InferenceCohereTruncateType.describe('For a `text_embedding` task, the method to handle inputs longer than the maximum token length. Valid values are: * `END`: When the input exceeds the maximum input token length, the end of the input is discarded. * `NONE`: When the input exceeds the maximum input token length, an error is returned. * `START`: When the input exceeds the maximum input token length, the start of the input is discarded.').optional()
}).meta({ id: 'InferenceCohereTaskSettings' })
export type InferenceCohereTaskSettings = z.infer<typeof InferenceCohereTaskSettings>

export const InferenceCohereTaskType = z.enum(['completion', 'rerank', 'text_embedding']).meta({ id: 'InferenceCohereTaskType' })
export type InferenceCohereTaskType = z.infer<typeof InferenceCohereTaskType>

/** The completion result object */
export const InferenceCompletionResult = z.object({
  result: z.string()
}).meta({ id: 'InferenceCompletionResult' })
export type InferenceCompletionResult = z.infer<typeof InferenceCompletionResult>

/** Defines the completion result. */
export const InferenceCompletionInferenceResult = z.object({
  completion: z.array(InferenceCompletionResult)
}).meta({ id: 'InferenceCompletionInferenceResult' })
export type InferenceCompletionInferenceResult = z.infer<typeof InferenceCompletionInferenceResult>

/** The completion tool function definition. */
export const InferenceCompletionToolFunction = z.object({
  description: z.string().describe('A description of what the function does. This is used by the model to choose when and how to call the function.').optional(),
  name: z.string().describe('The name of the function.'),
  parameters: z.any().describe('The parameters the functional accepts. This should be formatted as a JSON object.').optional(),
  strict: z.boolean().describe('Whether to enable schema adherence when generating the function call.').optional()
}).meta({ id: 'InferenceCompletionToolFunction' })
export type InferenceCompletionToolFunction = z.infer<typeof InferenceCompletionToolFunction>

/** A list of tools that the model can call. */
export const InferenceCompletionTool = z.object({
  type: z.string().describe('The type of tool.'),
  function: InferenceCompletionToolFunction.describe('The function definition.')
}).meta({ id: 'InferenceCompletionTool' })
export type InferenceCompletionTool = z.infer<typeof InferenceCompletionTool>

/** The tool choice function. */
export const InferenceCompletionToolChoiceFunction = z.object({
  name: z.string().describe('The name of the function to call.')
}).meta({ id: 'InferenceCompletionToolChoiceFunction' })
export type InferenceCompletionToolChoiceFunction = z.infer<typeof InferenceCompletionToolChoiceFunction>

/** Controls which tool is called by the model. */
export const InferenceCompletionToolChoice = z.object({
  type: z.string().describe('The type of the tool.'),
  function: InferenceCompletionToolChoiceFunction.describe('The tool choice function.')
}).meta({ id: 'InferenceCompletionToolChoice' })
export type InferenceCompletionToolChoice = z.infer<typeof InferenceCompletionToolChoice>

export const InferenceCompletionToolType = z.union([z.string(), InferenceCompletionToolChoice]).meta({ id: 'InferenceCompletionToolType' })
export type InferenceCompletionToolType = z.infer<typeof InferenceCompletionToolType>

export const InferenceContentType = z.enum(['text', 'image_url', 'file']).meta({ id: 'InferenceContentType' })
export type InferenceContentType = z.infer<typeof InferenceContentType>

export const InferenceImageUrlDetail = z.enum(['auto', 'low', 'high']).meta({ id: 'InferenceImageUrlDetail' })
export type InferenceImageUrlDetail = z.infer<typeof InferenceImageUrlDetail>

export const InferenceImageUrl = z.object({
  url: z.string().describe('The base64 encoded image data as a data URI'),
  detail: InferenceImageUrlDetail.describe('Specifies the detail level of the image').optional()
}).meta({ id: 'InferenceImageUrl' })
export type InferenceImageUrl = z.infer<typeof InferenceImageUrl>

export const InferenceFileContent = z.object({
  file_data: z.string().describe('The base64 encoded file data'),
  filename: z.string().describe('The name of the file')
}).meta({ id: 'InferenceFileContent' })
export type InferenceFileContent = z.infer<typeof InferenceFileContent>

/** An object style representation of a single portion of a conversation. */
export const InferenceContentObject = z.object({
  type: InferenceContentType.describe('The type of content. Must be one of `text`, `image_url` or `file`. Not all services/models support content types other than "text"'),
  text: z.string().describe('The text content. Only applicable for the `text` type'),
  image_url: InferenceImageUrl.describe('The image content. Only applicable for the `image_url` type'),
  file: InferenceFileContent.describe('The file content. Only applicable for the `file` type')
}).meta({ id: 'InferenceContentObject' })
export type InferenceContentObject = z.infer<typeof InferenceContentObject>

export const InferenceContextualAIServiceSettings = z.object({
  api_key: z.string().describe('A valid API key for your Contexutual AI account. IMPORTANT: You need to provide the API key only once, during the inference model creation. The get inference endpoint API does not retrieve your API key.'),
  model_id: z.string().describe('The name of the model to use for the inference task. Refer to the Contextual AI documentation for the list of available rerank models.'),
  rate_limit: InferenceRateLimitSetting.describe('This setting helps to minimize the number of rate limit errors returned from Contextual AI. The `contextualai` service sets a default number of requests allowed per minute depending on the task type. For `rerank`, it is set to `1000`.').optional()
}).meta({ id: 'InferenceContextualAIServiceSettings' })
export type InferenceContextualAIServiceSettings = z.infer<typeof InferenceContextualAIServiceSettings>

export const InferenceContextualAIServiceType = z.enum(['contextualai']).meta({ id: 'InferenceContextualAIServiceType' })
export type InferenceContextualAIServiceType = z.infer<typeof InferenceContextualAIServiceType>

export const InferenceContextualAITaskSettings = z.object({
  instruction: z.string().describe('Instructions for the reranking model. Refer to <https://docs.contextual.ai/api-reference/rerank/rerank#body-instruction> Only for the `rerank` task type.').optional(),
  top_k: integer.describe('The number of most relevant documents to return. If not specified, the reranking results of all documents will be returned. Only for the `rerank` task type.').optional()
}).meta({ id: 'InferenceContextualAITaskSettings' })
export type InferenceContextualAITaskSettings = z.infer<typeof InferenceContextualAITaskSettings>

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

export const InferenceDeepSeekServiceSettings = z.object({
  api_key: z.string().describe('A valid API key for your DeepSeek account. You can find or create your DeepSeek API keys on the DeepSeek API key page. IMPORTANT: You need to provide the API key only once, during the inference model creation. The get inference endpoint API does not retrieve your API key.'),
  model_id: z.string().describe('For a `completion` or `chat_completion` task, the name of the model to use for the inference task. For the available `completion` and `chat_completion` models, refer to the [DeepSeek Models & Pricing docs](https://api-docs.deepseek.com/quick_start/pricing).'),
  url: z.string().describe('The URL endpoint to use for the requests. Defaults to `https://api.deepseek.com/chat/completions`.').optional()
}).meta({ id: 'InferenceDeepSeekServiceSettings' })
export type InferenceDeepSeekServiceSettings = z.infer<typeof InferenceDeepSeekServiceSettings>

export const InferenceDeepSeekServiceType = z.enum(['deepseek']).meta({ id: 'InferenceDeepSeekServiceType' })
export type InferenceDeepSeekServiceType = z.infer<typeof InferenceDeepSeekServiceType>

/** Acknowledged response. For dry_run, contains the list of pipelines which reference the inference endpoint */
export const InferenceDeleteInferenceEndpointResult = z.object({
  ...AcknowledgedResponseBase.shape,
  pipelines: z.array(z.string())
}).meta({ id: 'InferenceDeleteInferenceEndpointResult' })
export type InferenceDeleteInferenceEndpointResult = z.infer<typeof InferenceDeleteInferenceEndpointResult>

/**
 * Dense Embedding results containing bytes are represented as Dense
 * Vectors of bytes.
 */
export const InferenceDenseByteVector = z.array(byte).meta({ id: 'InferenceDenseByteVector' })
export type InferenceDenseByteVector = z.infer<typeof InferenceDenseByteVector>

/** The dense embedding result object for byte representation */
export const InferenceDenseEmbeddingByteResult = z.object({
  embedding: InferenceDenseByteVector
}).meta({ id: 'InferenceDenseEmbeddingByteResult' })
export type InferenceDenseEmbeddingByteResult = z.infer<typeof InferenceDenseEmbeddingByteResult>

/**
 * Dense Embedding results are represented as Dense Vectors
 * of floats.
 */
export const InferenceDenseVector = z.array(float).meta({ id: 'InferenceDenseVector' })
export type InferenceDenseVector = z.infer<typeof InferenceDenseVector>

/** The dense embedding result object for float representation */
export const InferenceDenseEmbeddingResult = z.object({
  embedding: InferenceDenseVector
}).meta({ id: 'InferenceDenseEmbeddingResult' })
export type InferenceDenseEmbeddingResult = z.infer<typeof InferenceDenseEmbeddingResult>

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

export const InferenceEmbeddingContentFormat = z.enum(['text', 'base64']).meta({ id: 'InferenceEmbeddingContentFormat' })
export type InferenceEmbeddingContentFormat = z.infer<typeof InferenceEmbeddingContentFormat>

export const InferenceEmbeddingContentType = z.enum(['text', 'image']).meta({ id: 'InferenceEmbeddingContentType' })
export type InferenceEmbeddingContentType = z.infer<typeof InferenceEmbeddingContentType>

/** An object containing the input data for the model to embed. */
export const InferenceEmbeddingContentObjectContents = z.object({
  type: InferenceEmbeddingContentType.describe('The type of input to embed.'),
  format: InferenceEmbeddingContentFormat.describe('The format of the input. For the `text` type this must be `text`. For the `image` type, this must be `base64`. If not specified, this will default to `text` for the `text` type and `base64` for the `image` type.').optional(),
  value: z.string().describe('The value of the input to embed. For images, this must be a base64-encoded data URI, i.e. "data:content/type;base64,..."')
}).meta({ id: 'InferenceEmbeddingContentObjectContents' })
export type InferenceEmbeddingContentObjectContents = z.infer<typeof InferenceEmbeddingContentObjectContents>

/** A wrapper object which contains the fields required to specify multimodal inputs */
export const InferenceEmbeddingContentObject = z.object({
  content: InferenceEmbeddingContentObjectContents.describe('An object containing the input data for the model to embed')
}).meta({ id: 'InferenceEmbeddingContentObject' })
export type InferenceEmbeddingContentObject = z.infer<typeof InferenceEmbeddingContentObject>

/** Allows specifying multimodal inputs for the `embedding` task. */
export const InferenceEmbeddingContentInput = z.union([InferenceEmbeddingContentObject, z.array(InferenceEmbeddingContentObject)]).meta({ id: 'InferenceEmbeddingContentInput' })
export type InferenceEmbeddingContentInput = z.infer<typeof InferenceEmbeddingContentInput>

const InferenceEmbeddingInferenceResultExclusiveProps = z.union([z.object({ embeddings_bytes: z.array(InferenceDenseEmbeddingByteResult) }), z.object({ embeddings_bits: z.array(InferenceDenseEmbeddingByteResult) }), z.object({ embeddings: z.array(InferenceDenseEmbeddingResult) })])

/** EmbeddingInferenceResult is an aggregation of mutually exclusive embeddings variants */
export const InferenceEmbeddingInferenceResult = InferenceEmbeddingInferenceResultExclusiveProps.meta({ id: 'InferenceEmbeddingInferenceResult' })
export type InferenceEmbeddingInferenceResult = z.infer<typeof InferenceEmbeddingInferenceResult>

/** Allows specifying text-only inputs for the `embedding` task. */
export const InferenceEmbeddingStringInput = z.union([z.string(), z.array(z.string())]).meta({ id: 'InferenceEmbeddingStringInput' })
export type InferenceEmbeddingStringInput = z.infer<typeof InferenceEmbeddingStringInput>

/**
 * Inference input.
 * Either a string, an array of strings, a `content` object, or an array of `content` objects.
 */
export const InferenceEmbeddingInput = z.union([InferenceEmbeddingStringInput, InferenceEmbeddingContentInput]).meta({ id: 'InferenceEmbeddingInput' })
export type InferenceEmbeddingInput = z.infer<typeof InferenceEmbeddingInput>

/** The reasoning detail with encrypted reasoning data that may be redacted or protected. */
export const InferenceEncryptedReasoningDetail = z.object({
  ...InferenceBaseReasoningDetail.shape,
  type: z.literal('reasoning.encrypted'),
  data: z.string().describe('The encrypted reasoning data generated by the model, which may be redacted or protected based on the model\'s configuration and the nature of the reasoning information.')
}).meta({ id: 'InferenceEncryptedReasoningDetail' })
export type InferenceEncryptedReasoningDetail = z.infer<typeof InferenceEncryptedReasoningDetail>

export const InferenceFireworksAISimilarityType = z.enum(['cosine', 'dot_product', 'l2_norm']).meta({ id: 'InferenceFireworksAISimilarityType' })
export type InferenceFireworksAISimilarityType = z.infer<typeof InferenceFireworksAISimilarityType>

export const InferenceFireworksAIServiceSettings = z.object({
  api_key: z.string().describe('A valid API key for your Fireworks AI account. You can find or create your API keys in the Fireworks AI dashboard. IMPORTANT: You need to provide the API key only once, during the inference model creation. The get inference endpoint API does not retrieve your API key.'),
  model_id: z.string().describe('The name of the model to use for the inference task. Refer to the Fireworks AI documentation for the list of available models for chat completion, completion, and text embedding. For text embedding, supported models include the Qwen3 embedding family (e.g. `fireworks/qwen3-embedding-8b`) and other models in the Fireworks model library.'),
  url: z.string().describe('The URL endpoint to use for the requests. If not provided, the default Fireworks AI API endpoint is used.').optional(),
  dimensions: integer.describe('For a `text_embedding` task, the number of dimensions the resulting output embeddings should have. Variable-length embeddings are supported via this parameter.').optional(),
  similarity: InferenceFireworksAISimilarityType.describe('For a `text_embedding` task, the similarity measure. One of cosine, dot_product, l2_norm.').optional(),
  rate_limit: InferenceRateLimitSetting.describe('This setting helps to minimize the number of rate limit errors returned from the Fireworks AI API. Rate limit grouping is per API key only. By default, the `fireworksai` service sets the number of requests allowed per minute to 6000.').optional()
}).meta({ id: 'InferenceFireworksAIServiceSettings' })
export type InferenceFireworksAIServiceSettings = z.infer<typeof InferenceFireworksAIServiceSettings>

export const InferenceFireworksAIServiceType = z.enum(['fireworksai']).meta({ id: 'InferenceFireworksAIServiceType' })
export type InferenceFireworksAIServiceType = z.infer<typeof InferenceFireworksAIServiceType>

export const InferenceFireworksAITaskSettings = z.object({
  user: z.string().describe('For a `completion` or`chat_completion` task, specify the user issuing the request. This information can be used for abuse detection.').optional(),
  headers: z.record(z.string(), z.string()).describe('For a `completion` or`chat_completion` task. Specifies custom HTTP header parameters. For example: ``` "headers": {   "Custom-Header": "Some-Value",   "Another-Custom-Header": "Another-Value" } ```').optional()
}).meta({ id: 'InferenceFireworksAITaskSettings' })
export type InferenceFireworksAITaskSettings = z.infer<typeof InferenceFireworksAITaskSettings>

export const InferenceFireworksAITaskType = z.enum(['chat_completion', 'completion', 'text_embedding']).meta({ id: 'InferenceFireworksAITaskType' })
export type InferenceFireworksAITaskType = z.infer<typeof InferenceFireworksAITaskType>

export const InferenceGoogleAiServiceType = z.enum(['googleaistudio']).meta({ id: 'InferenceGoogleAiServiceType' })
export type InferenceGoogleAiServiceType = z.infer<typeof InferenceGoogleAiServiceType>

export const InferenceGoogleAiStudioServiceSettings = z.object({
  api_key: z.string().describe('A valid API key of your Google Gemini account.'),
  model_id: z.string().describe('The name of the model to use for the inference task. Refer to the Google documentation for the list of supported models.'),
  rate_limit: InferenceRateLimitSetting.describe('This setting helps to minimize the number of rate limit errors returned from Google AI Studio. By default, the `googleaistudio` service sets the number of requests allowed per minute to 360.').optional()
}).meta({ id: 'InferenceGoogleAiStudioServiceSettings' })
export type InferenceGoogleAiStudioServiceSettings = z.infer<typeof InferenceGoogleAiStudioServiceSettings>

export const InferenceGoogleAiStudioTaskType = z.enum(['completion', 'text_embedding']).meta({ id: 'InferenceGoogleAiStudioTaskType' })
export type InferenceGoogleAiStudioTaskType = z.infer<typeof InferenceGoogleAiStudioTaskType>

export const InferenceGoogleModelGardenProvider = z.enum(['google', 'anthropic', 'meta', 'hugging_face', 'mistral', 'ai21']).meta({ id: 'InferenceGoogleModelGardenProvider' })
export type InferenceGoogleModelGardenProvider = z.infer<typeof InferenceGoogleModelGardenProvider>

export const InferenceGoogleVertexAIServiceSettings = z.object({
  provider: InferenceGoogleModelGardenProvider.describe('The name of the Google Model Garden Provider for `completion` and `chat_completion` tasks. In order for a Google Model Garden endpoint to be used `provider` must be defined and be other than `google`. Modes: - Google Model Garden (third-party models): set `provider` to a supported non-`google` value and provide `url` and/or `streaming_url`. - Google Vertex AI: omit `provider` or set it to `google`. In this mode, do not set `url` or `streaming_url` and Elastic will construct the endpoint url from `location`, `model_id`, and `project_id` parameters.').optional(),
  url: z.string().describe('The URL for non-streaming `completion` requests to a Google Model Garden provider endpoint. If both `url` and `streaming_url` are provided, each is used for its respective mode. If `streaming_url` is not provided, `url` is also used for streaming `completion` and `chat_completion`. If `provider` is not provided or set to `google` (Google Vertex AI), do not set `url` (or `streaming_url`). At least one of `url` or `streaming_url` must be provided for Google Model Garden endpoint usage. Certain providers require separate URLs for streaming and non-streaming operations (e.g., Anthropic, Mistral, AI21). Others support both operation types through a single URL (e.g., Meta, Hugging Face). Information on constructing the URL for various providers can be found in the Google Model Garden documentation for the model, or on the endpoint’s `Sample request` page. The request examples also illustrate the proper formatting for the `url`.').optional(),
  streaming_url: z.string().describe('The URL for streaming `completion` and `chat_completion` requests to a Google Model Garden provider endpoint. If both `streaming_url` and `url` are provided, each is used for its respective mode. If `url` is not provided, `streaming_url` is also used for non-streaming `completion` requests. If `provider` is not provided or set to `google` (Google Vertex AI), do not set `streaming_url` (or `url`). At least one of `streaming_url` or `url` must be provided for Google Model Garden endpoint usage. Certain providers require separate URLs for streaming and non-streaming operations (e.g., Anthropic, Mistral, AI21). Others support both operation types through a single URL (e.g., Meta, Hugging Face). Information on constructing the URL for various providers can be found in the Google Model Garden documentation for the model, or on the endpoint’s `Sample request` page. The request examples also illustrate the proper formatting for the `streaming_url`.').optional(),
  location: z.string().describe('The name of the location to use for the inference task for the Google Vertex AI inference task. For Google Vertex AI, when `provider` is omitted or `google` `location` is mandatory. For Google Model Garden\'s `completion` and `chat_completion` tasks, when `provider` is a supported non-`google` value - `location` is ignored. Refer to the Google documentation for the list of supported locations.').optional(),
  model_id: z.string().describe('The name of the model to use for the inference task. For Google Vertex AI `model_id` is mandatory. For Google Model Garden\'s `completion` and `chat_completion` tasks, when `provider` is a supported non-`google` value - `model_id` will be used for some providers that require it, otherwise - ignored. Refer to the Google documentation for the list of supported models for Google Vertex AI.').optional(),
  project_id: z.string().describe('The name of the project to use for the Google Vertex AI inference task. For Google Vertex AI `project_id` is mandatory. For Google Model Garden\'s `completion` and `chat_completion` tasks, when `provider` is a supported non-`google` value - `project_id` is ignored.').optional(),
  rate_limit: InferenceRateLimitSetting.describe('This setting helps to minimize the number of rate limit errors returned from Google Vertex AI. By default, the `googlevertexai` service sets the number of requests allowed per minute to 30.000.').optional(),
  service_account_json: z.string().describe('A valid service account in JSON format for the Google Vertex AI API.'),
  dimensions: integer.describe('For a `text_embedding` task, the number of dimensions the resulting output embeddings should have. By default, the model\'s standard output dimension is used. Refer to the Google documentation for more information.').optional(),
  max_batch_size: integer.describe('Only applicable for the `text_embedding` task type. Controls the batch size of chunked inference requests sent to Google Vertex AI. Setting this parameter lower reduces the risk of exceeding token limits but may result in more API calls. Setting it higher increases throughput but may risk hitting token limits. To estimate a safe `max_batch_size` value, you can use it together with the `max_chunk_size` parameter using the following formula: `max_batch_size ≈ max_chunk_size × 1.3 × 512 ÷ 20000` Where: - `1.3` is an approximate tokens-per-word ratio - `512` is the maximum number of chunks that can be generated per document - `20000` is the Google Vertex AI token limit per request This estimate assumes the worst-case scenario with a document generating the maximum 512 chunks.').optional()
}).meta({ id: 'InferenceGoogleVertexAIServiceSettings' })
export type InferenceGoogleVertexAIServiceSettings = z.infer<typeof InferenceGoogleVertexAIServiceSettings>

export const InferenceGoogleVertexAIServiceType = z.enum(['googlevertexai']).meta({ id: 'InferenceGoogleVertexAIServiceType' })
export type InferenceGoogleVertexAIServiceType = z.infer<typeof InferenceGoogleVertexAIServiceType>

export const InferenceThinkingConfig = z.object({
  thinking_budget: integer.describe('Indicates the desired thinking budget in tokens.').optional()
}).meta({ id: 'InferenceThinkingConfig' })
export type InferenceThinkingConfig = z.infer<typeof InferenceThinkingConfig>

export const InferenceGoogleVertexAITaskSettings = z.object({
  auto_truncate: z.boolean().describe('For a `text_embedding` task, truncate inputs longer than the maximum token length automatically.').optional(),
  top_n: integer.describe('For a `rerank` task, the number of the top N documents that should be returned.').optional(),
  thinking_config: InferenceThinkingConfig.describe('For a `completion` or `chat_completion` task, allows configuration of the thinking features for the model. Refer to the Google documentation for the allowable configurations for each model type.').optional(),
  max_tokens: integer.describe('For `completion` and `chat_completion` tasks, specifies the `max_tokens` value for requests sent to the Google Model Garden `anthropic` provider. If `provider` is not set to `anthropic`, this field is ignored. If `max_tokens` is specified - it must be a positive integer. If not specified, the default value of 1024 is used. Anthropic models require `max_tokens` to be set for each request. Please refer to the Anthropic documentation for more information.').optional()
}).meta({ id: 'InferenceGoogleVertexAITaskSettings' })
export type InferenceGoogleVertexAITaskSettings = z.infer<typeof InferenceGoogleVertexAITaskSettings>

export const InferenceGoogleVertexAITaskType = z.enum(['rerank', 'text_embedding', 'completion', 'chat_completion']).meta({ id: 'InferenceGoogleVertexAITaskType' })
export type InferenceGoogleVertexAITaskType = z.infer<typeof InferenceGoogleVertexAITaskType>

export const InferenceGroqServiceSettings = z.object({
  model_id: z.string().describe('The name of the model to use for the inference task. Refer to the Groq model documentation for the list of supported models and versions. Service has been tested and confirmed to be working for `completion` and `chat_completion` tasks with the following models: * `llama-3.3-70b-versatile`'),
  api_key: z.string().describe('A valid API key for accessing Groq API. IMPORTANT: You need to provide the API key only once, during the inference model creation. The get inference endpoint API does not retrieve your API key.').optional(),
  rate_limit: InferenceRateLimitSetting.describe('This setting helps to minimize the number of rate limit errors returned from the Groq API. By default, the `groq` service sets the number of requests allowed per minute to 1000. Refer to Groq documentation for more details.').optional()
}).meta({ id: 'InferenceGroqServiceSettings' })
export type InferenceGroqServiceSettings = z.infer<typeof InferenceGroqServiceSettings>

export const InferenceGroqServiceType = z.enum(['groq']).meta({ id: 'InferenceGroqServiceType' })
export type InferenceGroqServiceType = z.infer<typeof InferenceGroqServiceType>

export const InferenceGroqTaskType = z.enum(['chat_completion']).meta({ id: 'InferenceGroqTaskType' })
export type InferenceGroqTaskType = z.infer<typeof InferenceGroqTaskType>

export const InferenceHuggingFaceServiceSettings = z.object({
  api_key: z.string().describe('A valid access token for your HuggingFace account. You can create or find your access tokens on the HuggingFace settings page. IMPORTANT: You need to provide the API key only once, during the inference model creation. The get inference endpoint API does not retrieve your API key.'),
  rate_limit: InferenceRateLimitSetting.describe('This setting helps to minimize the number of rate limit errors returned from Hugging Face. By default, the `hugging_face` service sets the number of requests allowed per minute to 3000 for all supported tasks. Hugging Face does not publish a universal rate limit — actual limits may vary. It is recommended to adjust this value based on the capacity and limits of your specific deployment environment.').optional(),
  url: z.string().describe('The URL endpoint to use for the requests. For `completion` and `chat_completion` tasks, the deployed model must be compatible with the Hugging Face Chat Completion interface (see the linked external documentation for details). The endpoint URL for the request must include `/v1/chat/completions`. If the model supports the OpenAI Chat Completion schema, a toggle should appear in the interface. Enabling this toggle doesn\'t change any model behavior, it reveals the full endpoint URL needed (which should include `/v1/chat/completions`) when configuring the inference endpoint in Elasticsearch. If the model doesn\'t support this schema, the toggle may not be shown.'),
  model_id: z.string().describe('The name of the HuggingFace model to use for the inference task. For `completion` and `chat_completion` tasks, this field is optional but may be required for certain models — particularly when using serverless inference endpoints. For the `text_embedding` task, this field should not be included. Otherwise, the request will fail.').optional()
}).meta({ id: 'InferenceHuggingFaceServiceSettings' })
export type InferenceHuggingFaceServiceSettings = z.infer<typeof InferenceHuggingFaceServiceSettings>

export const InferenceHuggingFaceServiceType = z.enum(['hugging_face']).meta({ id: 'InferenceHuggingFaceServiceType' })
export type InferenceHuggingFaceServiceType = z.infer<typeof InferenceHuggingFaceServiceType>

export const InferenceHuggingFaceTaskSettings = z.object({
  return_documents: z.boolean().describe('For a `rerank` task, return doc text within the results.').optional(),
  top_n: integer.describe('For a `rerank` task, the number of most relevant documents to return. It defaults to the number of the documents.').optional()
}).meta({ id: 'InferenceHuggingFaceTaskSettings' })
export type InferenceHuggingFaceTaskSettings = z.infer<typeof InferenceHuggingFaceTaskSettings>

export const InferenceHuggingFaceTaskType = z.enum(['chat_completion', 'completion', 'rerank', 'text_embedding']).meta({ id: 'InferenceHuggingFaceTaskType' })
export type InferenceHuggingFaceTaskType = z.infer<typeof InferenceHuggingFaceTaskType>

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

export const InferenceTaskType = z.enum(['sparse_embedding', 'text_embedding', 'rerank', 'completion', 'chat_completion', 'embedding']).meta({ id: 'InferenceTaskType' })
export type InferenceTaskType = z.infer<typeof InferenceTaskType>

/** Represents an inference endpoint as returned by the GET API */
export const InferenceInferenceEndpointInfo = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskType.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfo' })
export type InferenceInferenceEndpointInfo = z.infer<typeof InferenceInferenceEndpointInfo>

export const InferenceTaskTypeAi21 = z.enum(['completion', 'chat_completion']).meta({ id: 'InferenceTaskTypeAi21' })
export type InferenceTaskTypeAi21 = z.infer<typeof InferenceTaskTypeAi21>

export const InferenceInferenceEndpointInfoAi21 = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeAi21.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoAi21' })
export type InferenceInferenceEndpointInfoAi21 = z.infer<typeof InferenceInferenceEndpointInfoAi21>

export const InferenceTaskTypeAlibabaCloudAI = z.enum(['text_embedding', 'rerank', 'completion', 'sparse_embedding']).meta({ id: 'InferenceTaskTypeAlibabaCloudAI' })
export type InferenceTaskTypeAlibabaCloudAI = z.infer<typeof InferenceTaskTypeAlibabaCloudAI>

export const InferenceInferenceEndpointInfoAlibabaCloudAI = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeAlibabaCloudAI.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoAlibabaCloudAI' })
export type InferenceInferenceEndpointInfoAlibabaCloudAI = z.infer<typeof InferenceInferenceEndpointInfoAlibabaCloudAI>

export const InferenceTaskTypeAmazonBedrock = z.enum(['chat_completion', 'completion', 'text_embedding']).meta({ id: 'InferenceTaskTypeAmazonBedrock' })
export type InferenceTaskTypeAmazonBedrock = z.infer<typeof InferenceTaskTypeAmazonBedrock>

export const InferenceInferenceEndpointInfoAmazonBedrock = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeAmazonBedrock.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoAmazonBedrock' })
export type InferenceInferenceEndpointInfoAmazonBedrock = z.infer<typeof InferenceInferenceEndpointInfoAmazonBedrock>

export const InferenceTaskTypeAmazonSageMaker = z.enum(['text_embedding', 'completion', 'chat_completion', 'sparse_embedding', 'rerank']).meta({ id: 'InferenceTaskTypeAmazonSageMaker' })
export type InferenceTaskTypeAmazonSageMaker = z.infer<typeof InferenceTaskTypeAmazonSageMaker>

export const InferenceInferenceEndpointInfoAmazonSageMaker = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeAmazonSageMaker.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoAmazonSageMaker' })
export type InferenceInferenceEndpointInfoAmazonSageMaker = z.infer<typeof InferenceInferenceEndpointInfoAmazonSageMaker>

export const InferenceTaskTypeAnthropic = z.enum(['completion']).meta({ id: 'InferenceTaskTypeAnthropic' })
export type InferenceTaskTypeAnthropic = z.infer<typeof InferenceTaskTypeAnthropic>

export const InferenceInferenceEndpointInfoAnthropic = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeAnthropic.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoAnthropic' })
export type InferenceInferenceEndpointInfoAnthropic = z.infer<typeof InferenceInferenceEndpointInfoAnthropic>

export const InferenceTaskTypeAzureAIStudio = z.enum(['text_embedding', 'completion', 'rerank']).meta({ id: 'InferenceTaskTypeAzureAIStudio' })
export type InferenceTaskTypeAzureAIStudio = z.infer<typeof InferenceTaskTypeAzureAIStudio>

export const InferenceInferenceEndpointInfoAzureAIStudio = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeAzureAIStudio.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoAzureAIStudio' })
export type InferenceInferenceEndpointInfoAzureAIStudio = z.infer<typeof InferenceInferenceEndpointInfoAzureAIStudio>

export const InferenceTaskTypeAzureOpenAI = z.enum(['text_embedding', 'completion', 'chat_completion']).meta({ id: 'InferenceTaskTypeAzureOpenAI' })
export type InferenceTaskTypeAzureOpenAI = z.infer<typeof InferenceTaskTypeAzureOpenAI>

export const InferenceInferenceEndpointInfoAzureOpenAI = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeAzureOpenAI.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoAzureOpenAI' })
export type InferenceInferenceEndpointInfoAzureOpenAI = z.infer<typeof InferenceInferenceEndpointInfoAzureOpenAI>

export const InferenceTaskTypeCohere = z.enum(['text_embedding', 'rerank', 'completion']).meta({ id: 'InferenceTaskTypeCohere' })
export type InferenceTaskTypeCohere = z.infer<typeof InferenceTaskTypeCohere>

export const InferenceInferenceEndpointInfoCohere = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeCohere.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoCohere' })
export type InferenceInferenceEndpointInfoCohere = z.infer<typeof InferenceInferenceEndpointInfoCohere>

export const InferenceTaskTypeContextualAI = z.enum(['rerank']).meta({ id: 'InferenceTaskTypeContextualAI' })
export type InferenceTaskTypeContextualAI = z.infer<typeof InferenceTaskTypeContextualAI>

export const InferenceInferenceEndpointInfoContextualAi = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeContextualAI.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoContextualAi' })
export type InferenceInferenceEndpointInfoContextualAi = z.infer<typeof InferenceInferenceEndpointInfoContextualAi>

export const InferenceTaskTypeCustom = z.enum(['text_embedding', 'sparse_embedding', 'rerank', 'completion']).meta({ id: 'InferenceTaskTypeCustom' })
export type InferenceTaskTypeCustom = z.infer<typeof InferenceTaskTypeCustom>

export const InferenceInferenceEndpointInfoCustom = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeCustom.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoCustom' })
export type InferenceInferenceEndpointInfoCustom = z.infer<typeof InferenceInferenceEndpointInfoCustom>

export const InferenceTaskTypeDeepSeek = z.enum(['completion', 'chat_completion']).meta({ id: 'InferenceTaskTypeDeepSeek' })
export type InferenceTaskTypeDeepSeek = z.infer<typeof InferenceTaskTypeDeepSeek>

export const InferenceInferenceEndpointInfoDeepSeek = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeDeepSeek.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoDeepSeek' })
export type InferenceInferenceEndpointInfoDeepSeek = z.infer<typeof InferenceInferenceEndpointInfoDeepSeek>

export const InferenceTaskTypeELSER = z.enum(['sparse_embedding']).meta({ id: 'InferenceTaskTypeELSER' })
export type InferenceTaskTypeELSER = z.infer<typeof InferenceTaskTypeELSER>

export const InferenceInferenceEndpointInfoELSER = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeELSER.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoELSER' })
export type InferenceInferenceEndpointInfoELSER = z.infer<typeof InferenceInferenceEndpointInfoELSER>

export const InferenceTaskTypeElasticsearch = z.enum(['sparse_embedding', 'text_embedding', 'rerank']).meta({ id: 'InferenceTaskTypeElasticsearch' })
export type InferenceTaskTypeElasticsearch = z.infer<typeof InferenceTaskTypeElasticsearch>

export const InferenceInferenceEndpointInfoElasticsearch = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeElasticsearch.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoElasticsearch' })
export type InferenceInferenceEndpointInfoElasticsearch = z.infer<typeof InferenceInferenceEndpointInfoElasticsearch>

export const InferenceTaskTypeFireworksAI = z.enum(['chat_completion', 'completion', 'text_embedding']).meta({ id: 'InferenceTaskTypeFireworksAI' })
export type InferenceTaskTypeFireworksAI = z.infer<typeof InferenceTaskTypeFireworksAI>

export const InferenceInferenceEndpointInfoFireworksAI = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeFireworksAI.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoFireworksAI' })
export type InferenceInferenceEndpointInfoFireworksAI = z.infer<typeof InferenceInferenceEndpointInfoFireworksAI>

export const InferenceTaskTypeGoogleAIStudio = z.enum(['text_embedding', 'completion']).meta({ id: 'InferenceTaskTypeGoogleAIStudio' })
export type InferenceTaskTypeGoogleAIStudio = z.infer<typeof InferenceTaskTypeGoogleAIStudio>

export const InferenceInferenceEndpointInfoGoogleAIStudio = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeGoogleAIStudio.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoGoogleAIStudio' })
export type InferenceInferenceEndpointInfoGoogleAIStudio = z.infer<typeof InferenceInferenceEndpointInfoGoogleAIStudio>

export const InferenceTaskTypeGoogleVertexAI = z.enum(['chat_completion', 'completion', 'text_embedding', 'rerank']).meta({ id: 'InferenceTaskTypeGoogleVertexAI' })
export type InferenceTaskTypeGoogleVertexAI = z.infer<typeof InferenceTaskTypeGoogleVertexAI>

export const InferenceInferenceEndpointInfoGoogleVertexAI = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeGoogleVertexAI.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoGoogleVertexAI' })
export type InferenceInferenceEndpointInfoGoogleVertexAI = z.infer<typeof InferenceInferenceEndpointInfoGoogleVertexAI>

export const InferenceTaskTypeGroq = z.enum(['chat_completion']).meta({ id: 'InferenceTaskTypeGroq' })
export type InferenceTaskTypeGroq = z.infer<typeof InferenceTaskTypeGroq>

export const InferenceInferenceEndpointInfoGroq = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeGroq.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoGroq' })
export type InferenceInferenceEndpointInfoGroq = z.infer<typeof InferenceInferenceEndpointInfoGroq>

export const InferenceTaskTypeHuggingFace = z.enum(['chat_completion', 'completion', 'rerank', 'text_embedding']).meta({ id: 'InferenceTaskTypeHuggingFace' })
export type InferenceTaskTypeHuggingFace = z.infer<typeof InferenceTaskTypeHuggingFace>

export const InferenceInferenceEndpointInfoHuggingFace = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeHuggingFace.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoHuggingFace' })
export type InferenceInferenceEndpointInfoHuggingFace = z.infer<typeof InferenceInferenceEndpointInfoHuggingFace>

export const InferenceTaskTypeJinaAi = z.enum(['embedding', 'text_embedding', 'rerank']).meta({ id: 'InferenceTaskTypeJinaAi' })
export type InferenceTaskTypeJinaAi = z.infer<typeof InferenceTaskTypeJinaAi>

export const InferenceInferenceEndpointInfoJinaAi = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeJinaAi.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoJinaAi' })
export type InferenceInferenceEndpointInfoJinaAi = z.infer<typeof InferenceInferenceEndpointInfoJinaAi>

export const InferenceTaskTypeLlama = z.enum(['text_embedding', 'chat_completion', 'completion']).meta({ id: 'InferenceTaskTypeLlama' })
export type InferenceTaskTypeLlama = z.infer<typeof InferenceTaskTypeLlama>

export const InferenceInferenceEndpointInfoLlama = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeLlama.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoLlama' })
export type InferenceInferenceEndpointInfoLlama = z.infer<typeof InferenceInferenceEndpointInfoLlama>

export const InferenceTaskTypeMistral = z.enum(['text_embedding', 'chat_completion', 'completion']).meta({ id: 'InferenceTaskTypeMistral' })
export type InferenceTaskTypeMistral = z.infer<typeof InferenceTaskTypeMistral>

export const InferenceInferenceEndpointInfoMistral = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeMistral.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoMistral' })
export type InferenceInferenceEndpointInfoMistral = z.infer<typeof InferenceInferenceEndpointInfoMistral>

export const InferenceTaskTypeNvidia = z.enum(['chat_completion', 'completion', 'rerank', 'text_embedding']).meta({ id: 'InferenceTaskTypeNvidia' })
export type InferenceTaskTypeNvidia = z.infer<typeof InferenceTaskTypeNvidia>

export const InferenceInferenceEndpointInfoNvidia = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference ID'),
  task_type: InferenceTaskTypeNvidia.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoNvidia' })
export type InferenceInferenceEndpointInfoNvidia = z.infer<typeof InferenceInferenceEndpointInfoNvidia>

export const InferenceTaskTypeOpenAI = z.enum(['text_embedding', 'chat_completion', 'completion']).meta({ id: 'InferenceTaskTypeOpenAI' })
export type InferenceTaskTypeOpenAI = z.infer<typeof InferenceTaskTypeOpenAI>

export const InferenceInferenceEndpointInfoOpenAI = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeOpenAI.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoOpenAI' })
export type InferenceInferenceEndpointInfoOpenAI = z.infer<typeof InferenceInferenceEndpointInfoOpenAI>

export const InferenceTaskTypeOpenShiftAi = z.enum(['text_embedding', 'chat_completion', 'completion', 'rerank']).meta({ id: 'InferenceTaskTypeOpenShiftAi' })
export type InferenceTaskTypeOpenShiftAi = z.infer<typeof InferenceTaskTypeOpenShiftAi>

export const InferenceInferenceEndpointInfoOpenShiftAi = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeOpenShiftAi.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoOpenShiftAi' })
export type InferenceInferenceEndpointInfoOpenShiftAi = z.infer<typeof InferenceInferenceEndpointInfoOpenShiftAi>

export const InferenceTaskTypeVoyageAI = z.enum(['text_embedding', 'rerank']).meta({ id: 'InferenceTaskTypeVoyageAI' })
export type InferenceTaskTypeVoyageAI = z.infer<typeof InferenceTaskTypeVoyageAI>

export const InferenceInferenceEndpointInfoVoyageAI = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeVoyageAI.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoVoyageAI' })
export type InferenceInferenceEndpointInfoVoyageAI = z.infer<typeof InferenceInferenceEndpointInfoVoyageAI>

export const InferenceTaskTypeWatsonx = z.enum(['text_embedding', 'chat_completion', 'completion']).meta({ id: 'InferenceTaskTypeWatsonx' })
export type InferenceTaskTypeWatsonx = z.infer<typeof InferenceTaskTypeWatsonx>

export const InferenceInferenceEndpointInfoWatsonx = z.object({
  ...InferenceInferenceEndpoint.shape,
  inference_id: z.string().describe('The inference Id'),
  task_type: InferenceTaskTypeWatsonx.describe('The task type')
}).meta({ id: 'InferenceInferenceEndpointInfoWatsonx' })
export type InferenceInferenceEndpointInfoWatsonx = z.infer<typeof InferenceInferenceEndpointInfoWatsonx>

/**
 * Sparse Embedding tokens are represented as a dictionary
 * of string to double.
 */
export const InferenceSparseVector = z.record(z.string(), float).meta({ id: 'InferenceSparseVector' })
export type InferenceSparseVector = z.infer<typeof InferenceSparseVector>

export const InferenceSparseEmbeddingResult = z.object({
  is_truncated: z.boolean().describe('Indicates if the text input was truncated in the request sent to the service'),
  embedding: InferenceSparseVector
}).meta({ id: 'InferenceSparseEmbeddingResult' })
export type InferenceSparseEmbeddingResult = z.infer<typeof InferenceSparseEmbeddingResult>

/**
 * The rerank result object representing a single ranked document
 * id: the original index of the document in the request
 * relevance_score: the relevance_score of the document relative to the query
 * text: Optional, the text of the document, if requested
 */
export const InferenceRankedDocument = z.object({
  index: integer,
  relevance_score: float,
  text: z.string().optional()
}).meta({ id: 'InferenceRankedDocument' })
export type InferenceRankedDocument = z.infer<typeof InferenceRankedDocument>

const InferenceInferenceResultExclusiveProps = z.union([z.object({ embeddings_bytes: z.array(InferenceDenseEmbeddingByteResult) }), z.object({ embeddings_bits: z.array(InferenceDenseEmbeddingByteResult) }), z.object({ embeddings: z.array(InferenceDenseEmbeddingResult) }), z.object({ text_embedding_bytes: z.array(InferenceDenseEmbeddingByteResult) }), z.object({ text_embedding_bits: z.array(InferenceDenseEmbeddingByteResult) }), z.object({ text_embedding: z.array(InferenceDenseEmbeddingResult) }), z.object({ sparse_embedding: z.array(InferenceSparseEmbeddingResult) }), z.object({ completion: z.array(InferenceCompletionResult) }), z.object({ rerank: z.array(InferenceRankedDocument) })])

/** InferenceResult is an aggregation of mutually exclusive variants */
export const InferenceInferenceResult = InferenceInferenceResultExclusiveProps.meta({ id: 'InferenceInferenceResult' })
export type InferenceInferenceResult = z.infer<typeof InferenceInferenceResult>

export const InferenceJinaAIElementType = z.enum(['binary', 'bit', 'float']).meta({ id: 'InferenceJinaAIElementType' })
export type InferenceJinaAIElementType = z.infer<typeof InferenceJinaAIElementType>

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

export const InferenceLlamaSimilarityType = z.enum(['cosine', 'dot_product', 'l2_norm']).meta({ id: 'InferenceLlamaSimilarityType' })
export type InferenceLlamaSimilarityType = z.infer<typeof InferenceLlamaSimilarityType>

export const InferenceLlamaServiceSettings = z.object({
  url: z.string().describe('The URL endpoint of the Llama stack endpoint. URL must contain: * For `text_embedding` task - `/v1/inference/embeddings`. * For `completion` and `chat_completion` tasks - `/v1/openai/v1/chat/completions`.'),
  model_id: z.string().describe('The name of the model to use for the inference task. Refer to the Llama downloading models documentation for different ways of getting a list of available models and downloading them. Service has been tested and confirmed to be working with the following models: * For `text_embedding` task - `all-MiniLM-L6-v2`. * For `completion` and `chat_completion` tasks - `llama3.2:3b`.'),
  max_input_tokens: integer.describe('For a `text_embedding` task, the maximum number of tokens per input before chunking occurs.').optional(),
  similarity: InferenceLlamaSimilarityType.describe('For a `text_embedding` task, the similarity measure. One of cosine, dot_product, l2_norm.').optional(),
  rate_limit: InferenceRateLimitSetting.describe('This setting helps to minimize the number of rate limit errors returned from the Llama API. By default, the `llama` service sets the number of requests allowed per minute to 3000.').optional()
}).meta({ id: 'InferenceLlamaServiceSettings' })
export type InferenceLlamaServiceSettings = z.infer<typeof InferenceLlamaServiceSettings>

export const InferenceLlamaServiceType = z.enum(['llama']).meta({ id: 'InferenceLlamaServiceType' })
export type InferenceLlamaServiceType = z.infer<typeof InferenceLlamaServiceType>

export const InferenceLlamaTaskType = z.enum(['text_embedding', 'completion', 'chat_completion']).meta({ id: 'InferenceLlamaTaskType' })
export type InferenceLlamaTaskType = z.infer<typeof InferenceLlamaTaskType>

export const InferenceMessageContent = z.union([z.string(), z.array(InferenceContentObject)]).meta({ id: 'InferenceMessageContent' })
export type InferenceMessageContent = z.infer<typeof InferenceMessageContent>

/** The function that the model called. */
export const InferenceToolCallFunction = z.object({
  arguments: z.string().describe('The arguments to call the function with in JSON format.'),
  name: z.string().describe('The name of the function to call.')
}).meta({ id: 'InferenceToolCallFunction' })
export type InferenceToolCallFunction = z.infer<typeof InferenceToolCallFunction>

/** A tool call generated by the model. */
export const InferenceToolCall = z.object({
  id: Id.describe('The identifier of the tool call.'),
  function: InferenceToolCallFunction.describe('The function that the model called.'),
  type: z.string().describe('The type of the tool call.')
}).meta({ id: 'InferenceToolCall' })
export type InferenceToolCall = z.infer<typeof InferenceToolCall>

/** The reasoning summary detail includes a high-level summary of the model's reasoning process. */
export const InferenceSummaryReasoningDetail = z.object({
  ...InferenceBaseReasoningDetail.shape,
  type: z.literal('reasoning.summary'),
  summary: z.string().describe('The summary of the reasoning process generated by the model, which provides an overview of the key points and conclusions reached during the reasoning process.')
}).meta({ id: 'InferenceSummaryReasoningDetail' })
export type InferenceSummaryReasoningDetail = z.infer<typeof InferenceSummaryReasoningDetail>

/** The reasoning text detail includes plaintext reasoning with optional signature verification. */
export const InferenceTextReasoningDetail = z.object({
  ...InferenceBaseReasoningDetail.shape,
  type: z.literal('reasoning.text'),
  signature: z.string().describe('The signature of the reasoning text, which can be used to verify the authenticity and integrity of the reasoning information provided by the model.').optional(),
  text: z.string().describe('The plaintext reasoning generated by the model, which provides a detailed explanation of the model\'s reasoning process in human-readable form.').optional()
}).meta({ id: 'InferenceTextReasoningDetail' })
export type InferenceTextReasoningDetail = z.infer<typeof InferenceTextReasoningDetail>

/**
 * Type representing the different types of reasoning details that can be included in the response from the model.
 * Currently supported only for `elastic` provider.
 */
export const InferenceReasoningDetail = z.union([InferenceEncryptedReasoningDetail, InferenceSummaryReasoningDetail, InferenceTextReasoningDetail]).meta({ id: 'InferenceReasoningDetail' })
export type InferenceReasoningDetail = z.infer<typeof InferenceReasoningDetail>

/** An object representing part of the conversation. */
export const InferenceMessage = z.object({
  content: InferenceMessageContent.describe('The content of the message. String example: ``` {    "content": "Some string" } ``` Text example: ``` {   "content": [       {        "text": "Some text",        "type": "text"       }    ] } ``` Image example: ``` {   "content": [       {        "image_url": {          "url": "data:image/jpeg;base64,..."        },        "type": "image_url"       }    ] } ``` File example: ``` {   "content": [       {        "file": {          "file_data": "data:application/pdf;base64,...",          "filename": "somePDF"        },        "type": "file"       }    ] } ```').optional(),
  role: z.string().describe('The role of the message author. Valid values are `user`, `assistant`, `system`, and `tool`.'),
  tool_call_id: Id.describe('Only for `tool` role messages. The tool call that this message is responding to.').optional(),
  tool_calls: z.array(InferenceToolCall).describe('Only for `assistant` role messages. The tool calls generated by the model. If it\'s specified, the `content` field is optional. Example: ``` {   "tool_calls": [       {           "id": "call_KcAjWtAww20AihPHphUh46Gd",           "type": "function",           "function": {               "name": "get_current_weather",               "arguments": "{"location":"Boston, MA"}"           }       }   ] } ```').optional(),
  reasoning: z.string().describe('Only for `assistant` role messages. The reasoning details generated by the model as plaintext. Currently supported only for `elastic` provider.').optional(),
  reasoning_details: z.array(InferenceReasoningDetail).describe('Only for `assistant` role messages. The reasoning details generated by the model as structured data. Currently supported only for `elastic` provider.').optional()
}).meta({ id: 'InferenceMessage' })
export type InferenceMessage = z.infer<typeof InferenceMessage>

export const InferenceMistralServiceSettings = z.object({
  api_key: z.string().describe('A valid API key of your Mistral account. You can find your Mistral API keys or you can create a new one on the API Keys page. IMPORTANT: You need to provide the API key only once, during the inference model creation. The get inference endpoint API does not retrieve your API key.'),
  max_input_tokens: integer.describe('The maximum number of tokens per input before chunking occurs.').optional(),
  model: z.string().describe('The name of the model to use for the inference task. Refer to the Mistral models documentation for the list of available models.'),
  rate_limit: InferenceRateLimitSetting.describe('This setting helps to minimize the number of rate limit errors returned from the Mistral API. By default, the `mistral` service sets the number of requests allowed per minute to 240.').optional()
}).meta({ id: 'InferenceMistralServiceSettings' })
export type InferenceMistralServiceSettings = z.infer<typeof InferenceMistralServiceSettings>

export const InferenceMistralServiceType = z.enum(['mistral']).meta({ id: 'InferenceMistralServiceType' })
export type InferenceMistralServiceType = z.infer<typeof InferenceMistralServiceType>

export const InferenceMistralTaskType = z.enum(['text_embedding', 'completion', 'chat_completion']).meta({ id: 'InferenceMistralTaskType' })
export type InferenceMistralTaskType = z.infer<typeof InferenceMistralTaskType>

export const InferenceNvidiaInputType = z.enum(['ingest', 'search']).meta({ id: 'InferenceNvidiaInputType' })
export type InferenceNvidiaInputType = z.infer<typeof InferenceNvidiaInputType>

export const InferenceNvidiaSimilarityType = z.enum(['cosine', 'dot_product', 'l2_norm']).meta({ id: 'InferenceNvidiaSimilarityType' })
export type InferenceNvidiaSimilarityType = z.infer<typeof InferenceNvidiaSimilarityType>

export const InferenceNvidiaServiceSettings = z.object({
  api_key: z.string().describe('A valid API key for your Nvidia endpoint. Can be found in `API Keys` section of Nvidia account settings.'),
  url: z.string().describe('The URL of the Nvidia model endpoint. If not provided, the default endpoint URL is used depending on the task type: * For `text_embedding` task - `https://integrate.api.nvidia.com/v1/embeddings`. * For `completion` and `chat_completion` tasks - `https://integrate.api.nvidia.com/v1/chat/completions`. * For `rerank` task - `https://ai.api.nvidia.com/v1/retrieval/nvidia/reranking`.').optional(),
  model_id: z.string().describe('The name of the model to use for the inference task. Refer to the model\'s documentation for the name if needed. Service has been tested and confirmed to be working with the following models: * For `text_embedding` task - `nvidia/llama-3.2-nv-embedqa-1b-v2`. * For `completion` and `chat_completion` tasks - `microsoft/phi-3-mini-128k-instruct`. * For `rerank` task - `nv-rerank-qa-mistral-4b:1`. Service doesn\'t support `text_embedding` task `baai/bge-m3` and `nvidia/nvclip` models due to them not recognizing the `input_type` parameter.'),
  max_input_tokens: integer.describe('For a `text_embedding` task, the maximum number of tokens per input. Inputs exceeding this value are truncated prior to sending to the Nvidia API.').optional(),
  similarity: InferenceNvidiaSimilarityType.describe('For a `text_embedding` task, the similarity measure. One of cosine, dot_product, l2_norm.').optional(),
  rate_limit: InferenceRateLimitSetting.describe('This setting helps to minimize the number of rate limit errors returned from the Nvidia API. By default, the `nvidia` service sets the number of requests allowed per minute to 3000.').optional()
}).meta({ id: 'InferenceNvidiaServiceSettings' })
export type InferenceNvidiaServiceSettings = z.infer<typeof InferenceNvidiaServiceSettings>

export const InferenceNvidiaServiceType = z.enum(['nvidia']).meta({ id: 'InferenceNvidiaServiceType' })
export type InferenceNvidiaServiceType = z.infer<typeof InferenceNvidiaServiceType>

export const InferenceNvidiaTaskSettings = z.object({
  input_type: InferenceNvidiaInputType.describe('For a `text_embedding` task, type of input sent to the Nvidia endpoint. Valid values are: * `ingest`: Mapped to Nvidia\'s `passage` value in request. Used when generating embeddings during indexing. * `search`: Mapped to Nvidia\'s `query` value in request. Used when generating embeddings during querying. IMPORTANT: For Nvidia endpoints, if the `input_type` field is not specified, it defaults to `query`.').optional(),
  truncate: InferenceCohereTruncateType.describe('For a `text_embedding` task, the method used by the Nvidia model to handle inputs longer than the maximum token length. Valid values are: * `END`: When the input exceeds the maximum input token length, the end of the input is discarded. * `NONE`: When the input exceeds the maximum input token length, an error is returned. * `START`: When the input exceeds the maximum input token length, the start of the input is discarded.').optional()
}).meta({ id: 'InferenceNvidiaTaskSettings' })
export type InferenceNvidiaTaskSettings = z.infer<typeof InferenceNvidiaTaskSettings>

export const InferenceNvidiaTaskType = z.enum(['chat_completion', 'completion', 'rerank', 'text_embedding']).meta({ id: 'InferenceNvidiaTaskType' })
export type InferenceNvidiaTaskType = z.infer<typeof InferenceNvidiaTaskType>

export const InferenceOpenAISimilarityType = z.enum(['cosine', 'dot_product', 'l2_norm']).meta({ id: 'InferenceOpenAISimilarityType' })
export type InferenceOpenAISimilarityType = z.infer<typeof InferenceOpenAISimilarityType>

export const InferenceOpenAIServiceSettings = z.object({
  api_key: z.string().describe('A valid API key of your OpenAI account. You can find your OpenAI API keys in your OpenAI account under the API keys section. IMPORTANT: You need to provide the API key only once, during the inference model creation. The get inference endpoint API does not retrieve your API key.'),
  dimensions: integer.describe('The number of dimensions the resulting output embeddings should have. It is supported only in `text-embedding-3` and later models. If it is not set, the OpenAI defined default for the model is used.').optional(),
  model_id: z.string().describe('The name of the model to use for the inference task. Refer to the OpenAI documentation for the list of available text embedding models.'),
  organization_id: z.string().describe('The unique identifier for your organization. You can find the Organization ID in your OpenAI account under *Settings > Organizations*.').optional(),
  rate_limit: InferenceRateLimitSetting.describe('This setting helps to minimize the number of rate limit errors returned from OpenAI. The `openai` service sets a default number of requests allowed per minute depending on the task type. For `text_embedding`, it is set to `3000`. For `completion`, it is set to `500`.').optional(),
  similarity: InferenceOpenAISimilarityType.describe('For a `text_embedding` task, the similarity measure. One of cosine, dot_product, l2_norm. Defaults to `dot_product`.').optional(),
  url: z.string().describe('The URL endpoint to use for the requests. It can be changed for testing purposes.').optional()
}).meta({ id: 'InferenceOpenAIServiceSettings' })
export type InferenceOpenAIServiceSettings = z.infer<typeof InferenceOpenAIServiceSettings>

export const InferenceOpenAIServiceType = z.enum(['openai']).meta({ id: 'InferenceOpenAIServiceType' })
export type InferenceOpenAIServiceType = z.infer<typeof InferenceOpenAIServiceType>

export const InferenceOpenAITaskSettings = z.object({
  user: z.string().describe('Specifies the user issuing the request. This information can be used for abuse detection.').optional(),
  headers: z.record(z.string(), z.string()).describe('Specifies custom HTTP header parameters. For example: ``` "headers": {   "Custom-Header": "Some-Value",   "Another-Custom-Header": "Another-Value" } ```').optional()
}).meta({ id: 'InferenceOpenAITaskSettings' })
export type InferenceOpenAITaskSettings = z.infer<typeof InferenceOpenAITaskSettings>

export const InferenceOpenAITaskType = z.enum(['chat_completion', 'completion', 'text_embedding']).meta({ id: 'InferenceOpenAITaskType' })
export type InferenceOpenAITaskType = z.infer<typeof InferenceOpenAITaskType>

export const InferenceOpenShiftAiSimilarityType = z.enum(['cosine', 'dot_product', 'l2_norm']).meta({ id: 'InferenceOpenShiftAiSimilarityType' })
export type InferenceOpenShiftAiSimilarityType = z.infer<typeof InferenceOpenShiftAiSimilarityType>

export const InferenceOpenShiftAiServiceSettings = z.object({
  api_key: z.string().describe('A valid API key for your OpenShift AI endpoint. Can be found in `Token authentication` section of model related information.'),
  url: z.string().describe('The URL of the OpenShift AI hosted model endpoint.'),
  model_id: z.string().describe('The name of the model to use for the inference task. Refer to the hosted model\'s documentation for the name if needed. Service has been tested and confirmed to be working with the following models: * For `text_embedding` task - `gritlm-7b`. * For `completion` and `chat_completion` tasks - `llama-31-8b-instruct`. * For `rerank` task - `bge-reranker-v2-m3`.').optional(),
  max_input_tokens: integer.describe('For a `text_embedding` task, the maximum number of tokens per input before chunking occurs.').optional(),
  similarity: InferenceOpenShiftAiSimilarityType.describe('For a `text_embedding` task, the similarity measure. One of cosine, dot_product, l2_norm. If not specified, the default dot_product value is used.').optional(),
  rate_limit: InferenceRateLimitSetting.describe('This setting helps to minimize the number of rate limit errors returned from the OpenShift AI API. By default, the `openshift_ai` service sets the number of requests allowed per minute to 3000.').optional()
}).meta({ id: 'InferenceOpenShiftAiServiceSettings' })
export type InferenceOpenShiftAiServiceSettings = z.infer<typeof InferenceOpenShiftAiServiceSettings>

export const InferenceOpenShiftAiServiceType = z.enum(['openshift_ai']).meta({ id: 'InferenceOpenShiftAiServiceType' })
export type InferenceOpenShiftAiServiceType = z.infer<typeof InferenceOpenShiftAiServiceType>

export const InferenceOpenShiftAiTaskSettings = z.object({
  return_documents: z.boolean().describe('For a `rerank` task, whether to return the source documents in the response.').optional(),
  top_n: integer.describe('For a `rerank` task, the number of most relevant documents to return.').optional()
}).meta({ id: 'InferenceOpenShiftAiTaskSettings' })
export type InferenceOpenShiftAiTaskSettings = z.infer<typeof InferenceOpenShiftAiTaskSettings>

export const InferenceOpenShiftAiTaskType = z.enum(['text_embedding', 'completion', 'chat_completion', 'rerank']).meta({ id: 'InferenceOpenShiftAiTaskType' })
export type InferenceOpenShiftAiTaskType = z.infer<typeof InferenceOpenShiftAiTaskType>

export const InferenceReasoningEffort = z.enum(['xhigh', 'high', 'medium', 'low', 'minimal', 'none']).meta({ id: 'InferenceReasoningEffort' })
export type InferenceReasoningEffort = z.infer<typeof InferenceReasoningEffort>

export const InferenceReasoningSummary = z.enum(['auto', 'concise', 'detailed']).meta({ id: 'InferenceReasoningSummary' })
export type InferenceReasoningSummary = z.infer<typeof InferenceReasoningSummary>

/**
 * The reasoning configuration to use for the completion request.
 * Currently supported only for `elastic` provider.
 */
export const InferenceReasoning = z.object({
  effort: InferenceReasoningEffort.describe('The level of effort the model should put into reasoning. This is a hint that guides the model in how much effort to put into reasoning, with `xhigh` being the most effort and `none` being no effort.').optional(),
  enabled: z.boolean().describe('Whether to enable reasoning with default settings. This is a shortcut for enabling reasoning without having to specify the other parameters. If `enabled` is set to `true`, then reasoning at the `medium` effort level is enabled. Ignored if `effort` is specified, in which case that parameter will control the reasoning process instead.').optional(),
  exclude: z.boolean().describe('Whether to exclude reasoning information from the response. If `true`, the response will not include any reasoning details.').optional(),
  summary: InferenceReasoningSummary.describe('The level of detail included in the reasoning summary returned in the response. This is a hint on how much detail to include in the summary of the reasoning that is returned in the response, with `auto` being the default level of detail, `concise` being less detail, and `detailed` being more detail.').optional()
}).meta({ id: 'InferenceReasoning' })
export type InferenceReasoning = z.infer<typeof InferenceReasoning>

export const InferenceRequestChatCompletion = z.object({
  messages: z.array(InferenceMessage).describe('A list of objects representing the conversation. Requests should generally only add new messages from the user (role `user`). The other message roles (`assistant`, `system`, or `tool`) should generally only be copied from the response to a previous completion request, such that the messages array is built up throughout a conversation.'),
  model: z.string().describe('The ID of the model to use. By default, the model ID is set to the value included when creating the inference endpoint.').optional(),
  max_completion_tokens: long.describe('The upper bound limit for the number of tokens that can be generated for a completion request.').optional(),
  reasoning: InferenceReasoning.describe('The reasoning configuration for the completion request. This controls the model\'s reasoning process in one of two ways: * By specifying the model’s reasoning effort level with the `effort` field. * By enabling reasoning with default settings by setting `enabled` field to `true`. It also includes optional settings to control: * The level of detail in the summary returned in the response with the `summary` field. * Whether reasoning details are included in the response at all with the `exclude` field. Example (effort): ``` {    "reasoning": {        "effort": "high",        "summary": "concise",        "exclude": false    } } ``` Example (enabled): ``` {    "reasoning": {        "enabled": true,        "summary": "concise",        "exclude": false    } } ``` Currently supported only for `elastic` provider.').optional(),
  stop: z.array(z.string()).describe('A sequence of strings to control when the model should stop generating additional tokens.').optional(),
  temperature: float.describe('The sampling temperature to use.').optional(),
  tool_choice: InferenceCompletionToolType.describe('Controls which tool is called by the model. String representation: One of `auto`, `none`, or `requrired`. `auto` allows the model to choose between calling tools and generating a message. `none` causes the model to not call any tools. `required` forces the model to call one or more tools. Example (object representation): ``` {   "tool_choice": {       "type": "function",       "function": {           "name": "get_current_weather"       }   } } ```').optional(),
  tools: z.array(InferenceCompletionTool).describe('A list of tools that the model can call. Example: ``` {   "tools": [       {           "type": "function",           "function": {               "name": "get_price_of_item",               "description": "Get the current price of an item",               "parameters": {                   "type": "object",                   "properties": {                       "item": {                           "id": "12345"                       },                       "unit": {                           "type": "currency"                       }                   }               }           }       }   ] } ```').optional(),
  top_p: float.describe('Nucleus sampling, an alternative to sampling with temperature.').optional()
}).meta({ id: 'InferenceRequestChatCompletion' })
export type InferenceRequestChatCompletion = z.infer<typeof InferenceRequestChatCompletion>

export const InferenceRequestEmbedding = z.object({
  input: InferenceEmbeddingInput.describe('Inference input. Either a string, an array of strings, a `content` object, or an array of `content` objects. string example: ``` "input": "Some text" ``` string array example: ``` "input": ["Some text", "Some more text"] ``` `content` object example: ``` "input": {     "content": {       "type": "image",       "format": "base64",       "value": "data:image/jpeg;base64,..."     }   } ``` `content` object array example: ``` "input": [   {     "content": {       "type": "text",       "format": "text",       "value": "Some text to generate an embedding"     }   },   {     "content": {       "type": "image",       "format": "base64",       "value": "data:image/jpeg;base64,..."     }   } ] ```'),
  input_type: z.string().describe('The input data type for the embedding model. Possible values include: * `SEARCH` * `INGEST` * `CLASSIFICATION` * `CLUSTERING` Not all models support all values. Unsupported values will trigger a validation exception. Accepted values depend on the configured inference service, refer to the relevant service-specific documentation for more info. > info > The `input_type` parameter specified on the root level of the request body will take precedence over the `input_type` parameter specified in `task_settings`.').optional(),
  task_settings: InferenceTaskSettings.describe('Task settings for the individual inference request. These settings are specific to the <task_type> you specified and override the task settings specified when initializing the service.').optional()
}).meta({ id: 'InferenceRequestEmbedding' })
export type InferenceRequestEmbedding = z.infer<typeof InferenceRequestEmbedding>

/** Defines the response for a rerank request. */
export const InferenceRerankedInferenceResult = z.object({
  rerank: z.array(InferenceRankedDocument)
}).meta({ id: 'InferenceRerankedInferenceResult' })
export type InferenceRerankedInferenceResult = z.infer<typeof InferenceRerankedInferenceResult>

/** The response format for the sparse embedding request. */
export const InferenceSparseEmbeddingInferenceResult = z.object({
  sparse_embedding: z.array(InferenceSparseEmbeddingResult)
}).meta({ id: 'InferenceSparseEmbeddingInferenceResult' })
export type InferenceSparseEmbeddingInferenceResult = z.infer<typeof InferenceSparseEmbeddingInferenceResult>

const InferenceTextEmbeddingInferenceResultExclusiveProps = z.union([z.object({ text_embedding_bytes: z.array(InferenceDenseEmbeddingByteResult) }), z.object({ text_embedding_bits: z.array(InferenceDenseEmbeddingByteResult) }), z.object({ text_embedding: z.array(InferenceDenseEmbeddingResult) })])

/** TextEmbeddingInferenceResult is an aggregation of mutually exclusive text_embedding variants */
export const InferenceTextEmbeddingInferenceResult = InferenceTextEmbeddingInferenceResultExclusiveProps.meta({ id: 'InferenceTextEmbeddingInferenceResult' })
export type InferenceTextEmbeddingInferenceResult = z.infer<typeof InferenceTextEmbeddingInferenceResult>

export const InferenceVoyageAIServiceSettings = z.object({
  dimensions: integer.describe('The number of dimensions for resulting output embeddings. This setting maps to `output_dimension` in the VoyageAI documentation. Only for the `text_embedding` task type.').optional(),
  model_id: z.string().describe('The name of the model to use for the inference task. Refer to the VoyageAI documentation for the list of available text embedding and rerank models.'),
  rate_limit: InferenceRateLimitSetting.describe('This setting helps to minimize the number of rate limit errors returned from VoyageAI. The `voyageai` service sets a default number of requests allowed per minute depending on the task type. For both `text_embedding` and `rerank`, it is set to `2000`.').optional(),
  embedding_type: float.describe('The data type for the embeddings to be returned. This setting maps to `output_dtype` in the VoyageAI documentation. Permitted values: float, int8, bit. `int8` is a synonym of `byte` in the VoyageAI documentation. `bit` is a synonym of `binary` in the VoyageAI documentation. Only for the `text_embedding` task type.').optional()
}).meta({ id: 'InferenceVoyageAIServiceSettings' })
export type InferenceVoyageAIServiceSettings = z.infer<typeof InferenceVoyageAIServiceSettings>

export const InferenceVoyageAIServiceType = z.enum(['voyageai']).meta({ id: 'InferenceVoyageAIServiceType' })
export type InferenceVoyageAIServiceType = z.infer<typeof InferenceVoyageAIServiceType>

export const InferenceVoyageAITaskSettings = z.object({
  input_type: z.string().describe('Type of the input text. Permitted values: `ingest` (maps to `document` in the VoyageAI documentation), `search` (maps to `query` in the VoyageAI documentation). Only for the `text_embedding` task type.').optional(),
  return_documents: z.boolean().describe('Whether to return the source documents in the response. Only for the `rerank` task type.').optional(),
  top_k: integer.describe('The number of most relevant documents to return. If not specified, the reranking results of all documents will be returned. Only for the `rerank` task type.').optional(),
  truncation: z.boolean().describe('Whether to truncate the input texts to fit within the context length.').optional()
}).meta({ id: 'InferenceVoyageAITaskSettings' })
export type InferenceVoyageAITaskSettings = z.infer<typeof InferenceVoyageAITaskSettings>

export const InferenceVoyageAITaskType = z.enum(['text_embedding', 'rerank']).meta({ id: 'InferenceVoyageAITaskType' })
export type InferenceVoyageAITaskType = z.infer<typeof InferenceVoyageAITaskType>

export const InferenceWatsonxServiceSettings = z.object({
  api_key: z.string().describe('A valid API key of your Watsonx account. You can find your Watsonx API keys or you can create a new one on the API keys page. IMPORTANT: You need to provide the API key only once, during the inference model creation. The get inference endpoint API does not retrieve your API key.'),
  api_version: z.string().describe('A version parameter that takes a version date in the format of `YYYY-MM-DD`. For the active version data parameters, refer to the Wastonx documentation.'),
  model_id: z.string().describe('The name of the model to use for the inference task. Refer to the IBM Embedding Models section in the Watsonx documentation for the list of available text embedding models. Refer to the IBM library - Foundation models in Watsonx.ai.'),
  project_id: z.string().describe('The identifier of the IBM Cloud project to use for the inference task.'),
  rate_limit: InferenceRateLimitSetting.describe('This setting helps to minimize the number of rate limit errors returned from Watsonx. By default, the `watsonxai` service sets the number of requests allowed per minute to 120.').optional(),
  url: z.string().describe('The URL of the inference endpoint that you created on Watsonx.')
}).meta({ id: 'InferenceWatsonxServiceSettings' })
export type InferenceWatsonxServiceSettings = z.infer<typeof InferenceWatsonxServiceSettings>

export const InferenceWatsonxServiceType = z.enum(['watsonxai']).meta({ id: 'InferenceWatsonxServiceType' })
export type InferenceWatsonxServiceType = z.infer<typeof InferenceWatsonxServiceType>

export const InferenceWatsonxTaskType = z.enum(['text_embedding', 'rerank', 'chat_completion', 'completion']).meta({ id: 'InferenceWatsonxTaskType' })
export type InferenceWatsonxTaskType = z.infer<typeof InferenceWatsonxTaskType>

/**
 * Perform chat completion inference on the service.
 *
 * The chat completion inference API enables real-time responses for chat completion tasks by delivering answers incrementally, reducing response times during computation.
 * It only works with the `chat_completion` task type.
 *
 * NOTE: The `chat_completion` task type is only available within the _stream API and only supports streaming.
 * The Chat completion inference API and the Stream inference API differ in their response structure and capabilities.
 * The Chat completion inference API provides more comprehensive customization options through more fields and function calling support.
 * To determine whether a given inference service supports this task type, please see the page for that service.
 */
export const InferenceChatCompletionUnifiedRequest = z.object({
  ...RequestBase.shape,
  inference_id: Id.describe('The inference Id').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference request to complete.').optional().meta({ found_in: 'query' }),
  chat_completion_request: InferenceRequestChatCompletion.optional().meta({ found_in: 'body' })
}).meta({ id: 'InferenceChatCompletionUnifiedRequest' })
export type InferenceChatCompletionUnifiedRequest = z.infer<typeof InferenceChatCompletionUnifiedRequest>

export const InferenceChatCompletionUnifiedResponse = StreamResult.meta({ id: 'InferenceChatCompletionUnifiedResponse' })
export type InferenceChatCompletionUnifiedResponse = z.infer<typeof InferenceChatCompletionUnifiedResponse>

/**
 * Perform completion inference on the service.
 *
 * Get responses for completion tasks.
 * This API works only with the completion task type.
 *
 * IMPORTANT: The inference APIs enable you to use certain services, such as built-in machine learning models (ELSER, E5), models uploaded through Eland, Cohere, OpenAI, Azure, Google AI Studio, Google Vertex AI, Anthropic, Watsonx.ai, or Hugging Face. For built-in models and models uploaded through Eland, the inference APIs offer an alternative way to use and manage trained models. However, if you do not plan to use the inference APIs to use these models or if you want to use non-NLP models, use the machine learning trained model APIs.
 *
 * This API requires the `monitor_inference` cluster privilege (the built-in `inference_admin` and `inference_user` roles grant this privilege).
 */
export const InferenceCompletionRequest = z.object({
  ...RequestBase.shape,
  inference_id: Id.describe('The inference Id').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference request to complete.').optional().meta({ found_in: 'query' }),
  input: z.union([z.string(), z.array(z.string())]).describe('Inference input. Either a string or an array of strings.').meta({ found_in: 'body' }),
  task_settings: InferenceTaskSettings.describe('Task settings for the individual inference request. These settings are specific to the <task_type> you specified and override the task settings specified when initializing the service.').optional().meta({ found_in: 'body' })
}).meta({ id: 'InferenceCompletionRequest' })
export type InferenceCompletionRequest = z.infer<typeof InferenceCompletionRequest>

export const InferenceCompletionResponse = InferenceCompletionInferenceResult.meta({ id: 'InferenceCompletionResponse' })
export type InferenceCompletionResponse = z.infer<typeof InferenceCompletionResponse>

/**
 * Delete an inference endpoint.
 *
 * This API requires the manage_inference cluster privilege (the built-in `inference_admin` role grants this privilege).
 */
export const InferenceDeleteRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceTaskType.describe('The task type').optional().meta({ found_in: 'path' }),
  inference_id: Id.describe('The inference identifier.').meta({ found_in: 'path' }),
  dry_run: z.boolean().describe('When true, checks the semantic_text fields and inference processors that reference the endpoint and returns them in a list, but does not delete the endpoint.').optional().meta({ found_in: 'query' }),
  force: z.boolean().describe('When true, the inference endpoint is forcefully deleted even if it is still being used by ingest processors or semantic text fields.').optional().meta({ found_in: 'query' })
}).meta({ id: 'InferenceDeleteRequest' })
export type InferenceDeleteRequest = z.infer<typeof InferenceDeleteRequest>

export const InferenceDeleteResponse = InferenceDeleteInferenceEndpointResult.meta({ id: 'InferenceDeleteResponse' })
export type InferenceDeleteResponse = z.infer<typeof InferenceDeleteResponse>

/** Perform dense embedding inference on the service. */
export const InferenceEmbeddingRequest = z.object({
  ...RequestBase.shape,
  inference_id: Id.describe('The inference Id').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference request to complete.').optional().meta({ found_in: 'query' }),
  embedding: InferenceRequestEmbedding.optional().meta({ found_in: 'body' })
}).meta({ id: 'InferenceEmbeddingRequest' })
export type InferenceEmbeddingRequest = z.infer<typeof InferenceEmbeddingRequest>

export const InferenceEmbeddingResponse = InferenceEmbeddingInferenceResult.meta({ id: 'InferenceEmbeddingResponse' })
export type InferenceEmbeddingResponse = z.infer<typeof InferenceEmbeddingResponse>

/**
 * Get an inference endpoint.
 *
 * This API requires the `monitor_inference` cluster privilege (the built-in `inference_admin` and `inference_user` roles grant this privilege).
 */
export const InferenceGetRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceTaskType.describe('The task type of the endpoint to return').optional().meta({ found_in: 'path' }),
  inference_id: Id.describe('The inference Id of the endpoint to return. Using `_all` or `*` will return all endpoints with the specified `task_type` if one is specified, or all endpoints for all task types if no `task_type` is specified').optional().meta({ found_in: 'path' })
}).meta({ id: 'InferenceGetRequest' })
export type InferenceGetRequest = z.infer<typeof InferenceGetRequest>

export const InferenceGetResponse = z.object({
  endpoints: z.array(InferenceInferenceEndpointInfo)
}).meta({ id: 'InferenceGetResponse' })
export type InferenceGetResponse = z.infer<typeof InferenceGetResponse>

/**
 * Perform inference on the service.
 *
 * This API enables you to use machine learning models to perform specific tasks on data that you provide as an input.
 * It returns a response with the results of the tasks.
 * The inference endpoint you use can perform one specific task that has been defined when the endpoint was created with the create inference API.
 *
 * For details about using this API with a service, such as Amazon Bedrock, Anthropic, or HuggingFace, refer to the service-specific documentation.
 *
 * > info
 * > The inference APIs enable you to use certain services, such as built-in machine learning models (ELSER, E5), models uploaded through Eland, Cohere, OpenAI, Azure, Google AI Studio, Google Vertex AI, Anthropic, Watsonx.ai, or Hugging Face. For built-in models and models uploaded through Eland, the inference APIs offer an alternative way to use and manage trained models. However, if you do not plan to use the inference APIs to use these models or if you want to use non-NLP models, use the machine learning trained model APIs.
 */
export const InferenceInferenceRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceTaskType.describe('The type of inference task that the model performs.').optional().meta({ found_in: 'path' }),
  inference_id: Id.describe('The unique identifier for the inference endpoint.').meta({ found_in: 'path' }),
  timeout: Duration.describe('The amount of time to wait for the inference request to complete.').optional().meta({ found_in: 'query' }),
  query: z.string().describe('The query input, which is required only for the `rerank` task. It is not required for other tasks.').optional().meta({ found_in: 'body' }),
  input: z.union([z.string(), z.array(z.string())]).describe('The text on which you want to perform the inference task. It can be a single string or an array. > info > Inference endpoints for the `completion` task type currently only support a single string as input.').meta({ found_in: 'body' }),
  input_type: z.string().describe('Specifies the input data type for the embedding model. The `input_type` parameter only applies to Inference Endpoints with the `embedding` or `text_embedding` task type. Possible values include: * `SEARCH` * `INGEST` * `CLASSIFICATION` * `CLUSTERING` Not all services support all values. Unsupported values will trigger a validation exception. Accepted values depend on the configured inference service, refer to the relevant service-specific documentation for more info. > info > The `input_type` parameter specified on the root level of the request body will take precedence over the `input_type` parameter specified in `task_settings`.').optional().meta({ found_in: 'body' }),
  task_settings: InferenceTaskSettings.describe('Task settings for the individual inference request. These settings are specific to the task type you specified and override the task settings specified when initializing the service.').optional().meta({ found_in: 'body' })
}).meta({ id: 'InferenceInferenceRequest' })
export type InferenceInferenceRequest = z.infer<typeof InferenceInferenceRequest>

export const InferenceInferenceResponse = InferenceInferenceResult.meta({ id: 'InferenceInferenceResponse' })
export type InferenceInferenceResponse = z.infer<typeof InferenceInferenceResponse>

/**
 * Create an inference endpoint.
 *
 * IMPORTANT: The inference APIs enable you to use certain services, such as built-in machine learning models (ELSER, E5), models uploaded through Eland, Cohere, OpenAI, Mistral, Azure OpenAI, Google AI Studio, Google Vertex AI, Anthropic, Watsonx.ai, or Hugging Face.
 * For built-in models and models uploaded through Eland, the inference APIs offer an alternative way to use and manage trained models.
 * However, if you do not plan to use the inference APIs to use these models or if you want to use non-NLP models, use the machine learning trained model APIs.
 *
 * The following integrations are available through the inference API. You can find the available task types next to the integration name:
 * * AI21 (`chat_completion`, `completion`)
 * * AlibabaCloud AI Search (`completion`, `rerank`, `sparse_embedding`, `text_embedding`)
 * * Amazon Bedrock (`chat_completion`, `completion`, `text_embedding`)
 * * Amazon SageMaker (`chat_completion`, `completion`, `rerank`, `sparse_embedding`, `text_embedding`)
 * * Anthropic (`completion`)
 * * Azure AI Studio (`completion`, `rerank`, `text_embedding`)
 * * Azure OpenAI (`chat_completion`, `completion`, `text_embedding`)
 * * Cohere (`completion`, `rerank`, `text_embedding`)
 * * DeepSeek (`chat_completion`, `completion`)
 * * Elasticsearch (`rerank`, `sparse_embedding`, `text_embedding` - this service is for built-in models and models uploaded through Eland)
 * * ELSER (`sparse_embedding`)
 * * Fireworks AI (`chat_completion`, `completion`, `text_embedding`)
 * * Google AI Studio (`completion`, `text_embedding`)
 * * Google Vertex AI (`chat_completion`, `completion`, `rerank`, `text_embedding`)
 * * Groq (`chat_completion`)
 * * Hugging Face (`chat_completion`, `completion`, `rerank`, `text_embedding`)
 * * JinaAI (`embedding`, `rerank`, `text_embedding`)
 * * Llama (`chat_completion`, `completion`, `text_embedding`)
 * * Mistral (`chat_completion`, `completion`, `text_embedding`)
 * * Nvidia (`chat_completion`, `completion`, `text_embedding`, `rerank`)
 * * OpenAI (`chat_completion`, `completion`, `text_embedding`)
 * * OpenShift AI (`chat_completion`, `completion`, `rerank`, `text_embedding`)
 * * VoyageAI (`rerank`, `text_embedding`)
 * * Watsonx (`chat_completion`, `completion`, `rerank`, `text_embedding`)
 */
export const InferencePutRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceTaskType.describe('The task type. Refer to the integration list in the API description for the available task types.').optional().meta({ found_in: 'path' }),
  inference_id: Id.describe('The inference Id').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference endpoint to be created.').optional().meta({ found_in: 'query' }),
  inference_config: InferenceInferenceEndpoint.optional().meta({ found_in: 'body' })
}).meta({ id: 'InferencePutRequest' })
export type InferencePutRequest = z.infer<typeof InferencePutRequest>

export const InferencePutResponse = InferenceInferenceEndpointInfo.meta({ id: 'InferencePutResponse' })
export type InferencePutResponse = z.infer<typeof InferencePutResponse>

/**
 * Create a AI21 inference endpoint.
 *
 * Create an inference endpoint to perform an inference task with the `ai21` service.
 */
export const InferencePutAi21Request = z.object({
  ...RequestBase.shape,
  task_type: InferenceAi21TaskType.describe('The type of the inference task that the model will perform.').meta({ found_in: 'path' }),
  ai21_inference_id: Id.describe('The unique identifier of the inference endpoint.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference endpoint to be created.').optional().meta({ found_in: 'query' }),
  service: InferenceAi21ServiceType.describe('The type of service supported for the specified task type. In this case, `ai21`.').meta({ found_in: 'body' }),
  service_settings: InferenceAi21ServiceSettings.describe('Settings used to install the inference model. These settings are specific to the `ai21` service.').meta({ found_in: 'body' })
}).meta({ id: 'InferencePutAi21Request' })
export type InferencePutAi21Request = z.infer<typeof InferencePutAi21Request>

export const InferencePutAi21Response = InferenceInferenceEndpointInfoAi21.meta({ id: 'InferencePutAi21Response' })
export type InferencePutAi21Response = z.infer<typeof InferencePutAi21Response>

/**
 * Create an AlibabaCloud AI Search inference endpoint.
 *
 * Create an inference endpoint to perform an inference task with the `alibabacloud-ai-search` service.
 */
export const InferencePutAlibabacloudRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceAlibabaCloudTaskType.describe('The type of the inference task that the model will perform.').meta({ found_in: 'path' }),
  alibabacloud_inference_id: Id.describe('The unique identifier of the inference endpoint.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference endpoint to be created.').optional().meta({ found_in: 'query' }),
  chunking_settings: InferenceInferenceChunkingSettings.describe('The chunking configuration object. Applies only to the `sparse_embedding` or `text_embedding` task types. Not applicable to the `rerank` or `completion` task types.').optional().meta({ found_in: 'body' }),
  service: InferenceAlibabaCloudServiceType.describe('The type of service supported for the specified task type. In this case, `alibabacloud-ai-search`.').meta({ found_in: 'body' }),
  service_settings: InferenceAlibabaCloudServiceSettings.describe('Settings used to install the inference model. These settings are specific to the `alibabacloud-ai-search` service.').meta({ found_in: 'body' }),
  task_settings: InferenceAlibabaCloudTaskSettings.describe('Settings to configure the inference task. These settings are specific to the task type you specified.').optional().meta({ found_in: 'body' })
}).meta({ id: 'InferencePutAlibabacloudRequest' })
export type InferencePutAlibabacloudRequest = z.infer<typeof InferencePutAlibabacloudRequest>

export const InferencePutAlibabacloudResponse = InferenceInferenceEndpointInfoAlibabaCloudAI.meta({ id: 'InferencePutAlibabacloudResponse' })
export type InferencePutAlibabacloudResponse = z.infer<typeof InferencePutAlibabacloudResponse>

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

/**
 * Create a Cohere inference endpoint.
 *
 * Create an inference endpoint to perform an inference task with the `cohere` service.
 */
export const InferencePutCohereRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceCohereTaskType.describe('The type of the inference task that the model will perform.').meta({ found_in: 'path' }),
  cohere_inference_id: Id.describe('The unique identifier of the inference endpoint.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference endpoint to be created.').optional().meta({ found_in: 'query' }),
  chunking_settings: InferenceInferenceChunkingSettings.describe('The chunking configuration object. Applies only to the `text_embedding` task type. Not applicable to the `rerank` or `completion` task type.').optional().meta({ found_in: 'body' }),
  service: InferenceCohereServiceType.describe('The type of service supported for the specified task type. In this case, `cohere`.').meta({ found_in: 'body' }),
  service_settings: InferenceCohereServiceSettings.describe('Settings used to install the inference model. These settings are specific to the `cohere` service.').meta({ found_in: 'body' }),
  task_settings: InferenceCohereTaskSettings.describe('Settings to configure the inference task. These settings are specific to the task type you specified.').optional().meta({ found_in: 'body' })
}).meta({ id: 'InferencePutCohereRequest' })
export type InferencePutCohereRequest = z.infer<typeof InferencePutCohereRequest>

export const InferencePutCohereResponse = InferenceInferenceEndpointInfoCohere.meta({ id: 'InferencePutCohereResponse' })
export type InferencePutCohereResponse = z.infer<typeof InferencePutCohereResponse>

/**
 * Create an Contextual AI inference endpoint.
 *
 * Create an inference endpoint to perform an inference task with the `contexualai` service.
 *
 * To review the available `rerank` models, refer to <https://docs.contextual.ai/api-reference/rerank/rerank#body-model>.
 */
export const InferencePutContextualaiRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceTaskTypeContextualAI.describe('The type of the inference task that the model will perform.').meta({ found_in: 'path' }),
  contextualai_inference_id: Id.describe('The unique identifier of the inference endpoint.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference endpoint to be created.').optional().meta({ found_in: 'query' }),
  service: InferenceContextualAIServiceType.describe('The type of service supported for the specified task type. In this case, `contextualai`.').meta({ found_in: 'body' }),
  service_settings: InferenceContextualAIServiceSettings.describe('Settings used to install the inference model. These settings are specific to the `contextualai` service.').meta({ found_in: 'body' }),
  task_settings: InferenceContextualAITaskSettings.describe('Settings to configure the inference task. These settings are specific to the task type you specified.').optional().meta({ found_in: 'body' })
}).meta({ id: 'InferencePutContextualaiRequest' })
export type InferencePutContextualaiRequest = z.infer<typeof InferencePutContextualaiRequest>

export const InferencePutContextualaiResponse = InferenceInferenceEndpointInfoContextualAi.meta({ id: 'InferencePutContextualaiResponse' })
export type InferencePutContextualaiResponse = z.infer<typeof InferencePutContextualaiResponse>

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

/**
 * Create a Fireworks AI inference endpoint.
 *
 * Create an inference endpoint to perform an inference task with the `fireworksai` service.
 */
export const InferencePutFireworksaiRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceFireworksAITaskType.describe('The type of the inference task that the model will perform.').meta({ found_in: 'path' }),
  fireworksai_inference_id: Id.describe('The unique identifier of the inference endpoint.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference endpoint to be created.').optional().meta({ found_in: 'query' }),
  chunking_settings: InferenceInferenceChunkingSettings.describe('The chunking configuration object. Applies only to the `text_embedding` task type. Not applicable to the `completion` or `chat_completion` task types.').optional().meta({ found_in: 'body' }),
  service: InferenceFireworksAIServiceType.describe('The type of service supported for the specified task type. In this case, `fireworksai`.').meta({ found_in: 'body' }),
  service_settings: InferenceFireworksAIServiceSettings.describe('Settings used to install the inference model. These settings are specific to the `fireworksai` service.').meta({ found_in: 'body' }),
  task_settings: InferenceFireworksAITaskSettings.describe('Settings to configure the inference task. Applies only to the `completion` or `chat_completion` task types. Not applicable to the `text_embedding` task type. These settings are specific to the task type you specified.').optional().meta({ found_in: 'body' })
}).meta({ id: 'InferencePutFireworksaiRequest' })
export type InferencePutFireworksaiRequest = z.infer<typeof InferencePutFireworksaiRequest>

export const InferencePutFireworksaiResponse = InferenceInferenceEndpointInfoFireworksAI.meta({ id: 'InferencePutFireworksaiResponse' })
export type InferencePutFireworksaiResponse = z.infer<typeof InferencePutFireworksaiResponse>

/**
 * Create an Google AI Studio inference endpoint.
 *
 * Create an inference endpoint to perform an inference task with the `googleaistudio` service.
 */
export const InferencePutGoogleaistudioRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceGoogleAiStudioTaskType.describe('The type of the inference task that the model will perform.').meta({ found_in: 'path' }),
  googleaistudio_inference_id: Id.describe('The unique identifier of the inference endpoint.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference endpoint to be created.').optional().meta({ found_in: 'query' }),
  chunking_settings: InferenceInferenceChunkingSettings.describe('The chunking configuration object. Applies only to the `text_embedding` task type. Not applicable to the `completion` task type.').optional().meta({ found_in: 'body' }),
  service: InferenceGoogleAiServiceType.describe('The type of service supported for the specified task type. In this case, `googleaistudio`.').meta({ found_in: 'body' }),
  service_settings: InferenceGoogleAiStudioServiceSettings.describe('Settings used to install the inference model. These settings are specific to the `googleaistudio` service.').meta({ found_in: 'body' })
}).meta({ id: 'InferencePutGoogleaistudioRequest' })
export type InferencePutGoogleaistudioRequest = z.infer<typeof InferencePutGoogleaistudioRequest>

export const InferencePutGoogleaistudioResponse = InferenceInferenceEndpointInfoGoogleAIStudio.meta({ id: 'InferencePutGoogleaistudioResponse' })
export type InferencePutGoogleaistudioResponse = z.infer<typeof InferencePutGoogleaistudioResponse>

/**
 * Create a Google Vertex AI inference endpoint.
 *
 * Create an inference endpoint to perform an inference task with the `googlevertexai` service.
 */
export const InferencePutGooglevertexaiRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceGoogleVertexAITaskType.describe('The type of the inference task that the model will perform.').meta({ found_in: 'path' }),
  googlevertexai_inference_id: Id.describe('The unique identifier of the inference endpoint.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference endpoint to be created.').optional().meta({ found_in: 'query' }),
  chunking_settings: InferenceInferenceChunkingSettings.describe('The chunking configuration object. Applies only to the `text_embedding` task type. Not applicable to the `rerank`, `completion`, or `chat_completion` task types.').optional().meta({ found_in: 'body' }),
  service: InferenceGoogleVertexAIServiceType.describe('The type of service supported for the specified task type. In this case, `googlevertexai`.').meta({ found_in: 'body' }),
  service_settings: InferenceGoogleVertexAIServiceSettings.describe('Settings used to install the inference model. These settings are specific to the `googlevertexai` service.').meta({ found_in: 'body' }),
  task_settings: InferenceGoogleVertexAITaskSettings.describe('Settings to configure the inference task. These settings are specific to the task type you specified.').optional().meta({ found_in: 'body' })
}).meta({ id: 'InferencePutGooglevertexaiRequest' })
export type InferencePutGooglevertexaiRequest = z.infer<typeof InferencePutGooglevertexaiRequest>

export const InferencePutGooglevertexaiResponse = InferenceInferenceEndpointInfoGoogleVertexAI.meta({ id: 'InferencePutGooglevertexaiResponse' })
export type InferencePutGooglevertexaiResponse = z.infer<typeof InferencePutGooglevertexaiResponse>

/**
 * Create a Groq inference endpoint.
 *
 * Create an inference endpoint to perform an inference task with the `groq` service.
 */
export const InferencePutGroqRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceGroqTaskType.describe('The type of the inference task that the model will perform.').meta({ found_in: 'path' }),
  groq_inference_id: Id.describe('The unique identifier of the inference endpoint.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference endpoint to be created.').optional().meta({ found_in: 'query' }),
  service: InferenceGroqServiceType.describe('The type of service supported for the specified task type. In this case, `groq`.').meta({ found_in: 'body' }),
  service_settings: InferenceGroqServiceSettings.describe('Settings used to install the inference model. These settings are specific to the `groq` service.').meta({ found_in: 'body' })
}).meta({ id: 'InferencePutGroqRequest' })
export type InferencePutGroqRequest = z.infer<typeof InferencePutGroqRequest>

export const InferencePutGroqResponse = InferenceInferenceEndpointInfoGroq.meta({ id: 'InferencePutGroqResponse' })
export type InferencePutGroqResponse = z.infer<typeof InferencePutGroqResponse>

/**
 * Create a Hugging Face inference endpoint.
 *
 * Create an inference endpoint to perform an inference task with the `hugging_face` service.
 * Supported tasks include: `text_embedding`, `completion`, and `chat_completion`.
 *
 * To configure the endpoint, first visit the Hugging Face Inference Endpoints page and create a new endpoint.
 * Select a model that supports the task you intend to use.
 *
 * For Elastic's `text_embedding` task:
 * The selected model must support the `Sentence Embeddings` task. On the new endpoint creation page, select the `Sentence Embeddings` task under the `Advanced Configuration` section.
 * After the endpoint has initialized, copy the generated endpoint URL.
 * Recommended models for `text_embedding` task:
 *
 * * `all-MiniLM-L6-v2`
 * * `all-MiniLM-L12-v2`
 * * `all-mpnet-base-v2`
 * * `e5-base-v2`
 * * `e5-small-v2`
 * * `multilingual-e5-base`
 * * `multilingual-e5-small`
 *
 * For Elastic's `chat_completion` and `completion` tasks:
 * The selected model must support the `Text Generation` task and expose OpenAI API. HuggingFace supports both serverless and dedicated endpoints for `Text Generation`. When creating dedicated endpoint select the `Text Generation` task.
 * After the endpoint is initialized (for dedicated) or ready (for serverless), ensure it supports the OpenAI API and includes `/v1/chat/completions` part in URL. Then, copy the full endpoint URL for use.
 * Recommended models for `chat_completion` and `completion` tasks:
 *
 * * `Mistral-7B-Instruct-v0.2`
 * * `QwQ-32B`
 * * `Phi-3-mini-128k-instruct`
 *
 * For Elastic's `rerank` task:
 * The selected model must support the `sentence-ranking` task and expose OpenAI API.
 * HuggingFace supports only dedicated (not serverless) endpoints for `Rerank` so far.
 * After the endpoint is initialized, copy the full endpoint URL for use.
 * Tested models for `rerank` task:
 *
 * * `bge-reranker-base`
 * * `jina-reranker-v1-turbo-en-GGUF`
 */
export const InferencePutHuggingFaceRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceHuggingFaceTaskType.describe('The type of the inference task that the model will perform.').meta({ found_in: 'path' }),
  huggingface_inference_id: Id.describe('The unique identifier of the inference endpoint.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference endpoint to be created.').optional().meta({ found_in: 'query' }),
  chunking_settings: InferenceInferenceChunkingSettings.describe('The chunking configuration object. Applies only to the `text_embedding` task type. Not applicable to the `rerank`, `completion`, or `chat_completion` task types.').optional().meta({ found_in: 'body' }),
  service: InferenceHuggingFaceServiceType.describe('The type of service supported for the specified task type. In this case, `hugging_face`.').meta({ found_in: 'body' }),
  service_settings: InferenceHuggingFaceServiceSettings.describe('Settings used to install the inference model. These settings are specific to the `hugging_face` service.').meta({ found_in: 'body' }),
  task_settings: InferenceHuggingFaceTaskSettings.describe('Settings to configure the inference task. These settings are specific to the task type you specified.').optional().meta({ found_in: 'body' })
}).meta({ id: 'InferencePutHuggingFaceRequest' })
export type InferencePutHuggingFaceRequest = z.infer<typeof InferencePutHuggingFaceRequest>

export const InferencePutHuggingFaceResponse = InferenceInferenceEndpointInfoHuggingFace.meta({ id: 'InferencePutHuggingFaceResponse' })
export type InferencePutHuggingFaceResponse = z.infer<typeof InferencePutHuggingFaceResponse>

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

/**
 * Create a Llama inference endpoint.
 *
 * Create an inference endpoint to perform an inference task with the `llama` service.
 */
export const InferencePutLlamaRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceLlamaTaskType.describe('The type of the inference task that the model will perform.').meta({ found_in: 'path' }),
  llama_inference_id: Id.describe('The unique identifier of the inference endpoint.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference endpoint to be created.').optional().meta({ found_in: 'query' }),
  chunking_settings: InferenceInferenceChunkingSettings.describe('The chunking configuration object. Applies only to the `text_embedding` task type. Not applicable to the `completion` or `chat_completion` task types.').optional().meta({ found_in: 'body' }),
  service: InferenceLlamaServiceType.describe('The type of service supported for the specified task type. In this case, `llama`.').meta({ found_in: 'body' }),
  service_settings: InferenceLlamaServiceSettings.describe('Settings used to install the inference model. These settings are specific to the `llama` service.').meta({ found_in: 'body' })
}).meta({ id: 'InferencePutLlamaRequest' })
export type InferencePutLlamaRequest = z.infer<typeof InferencePutLlamaRequest>

export const InferencePutLlamaResponse = InferenceInferenceEndpointInfoLlama.meta({ id: 'InferencePutLlamaResponse' })
export type InferencePutLlamaResponse = z.infer<typeof InferencePutLlamaResponse>

/**
 * Create a Mistral inference endpoint.
 *
 * Create an inference endpoint to perform an inference task with the `mistral` service.
 */
export const InferencePutMistralRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceMistralTaskType.describe('The type of the inference task that the model will perform.').meta({ found_in: 'path' }),
  mistral_inference_id: Id.describe('The unique identifier of the inference endpoint.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference endpoint to be created.').optional().meta({ found_in: 'query' }),
  chunking_settings: InferenceInferenceChunkingSettings.describe('The chunking configuration object. Applies only to the `text_embedding` task type. Not applicable to the `completion` or `chat_completion` task types.').optional().meta({ found_in: 'body' }),
  service: InferenceMistralServiceType.describe('The type of service supported for the specified task type. In this case, `mistral`.').meta({ found_in: 'body' }),
  service_settings: InferenceMistralServiceSettings.describe('Settings used to install the inference model. These settings are specific to the `mistral` service.').meta({ found_in: 'body' })
}).meta({ id: 'InferencePutMistralRequest' })
export type InferencePutMistralRequest = z.infer<typeof InferencePutMistralRequest>

export const InferencePutMistralResponse = InferenceInferenceEndpointInfoMistral.meta({ id: 'InferencePutMistralResponse' })
export type InferencePutMistralResponse = z.infer<typeof InferencePutMistralResponse>

/**
 * Create an Nvidia inference endpoint.
 *
 * Create an inference endpoint to perform an inference task with the `nvidia` service.
 */
export const InferencePutNvidiaRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceNvidiaTaskType.describe('The type of the inference task that the model will perform. NOTE: The `chat_completion` task type only supports streaming and only through the _stream API.').meta({ found_in: 'path' }),
  nvidia_inference_id: Id.describe('The unique identifier of the inference endpoint.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference endpoint to be created.').optional().meta({ found_in: 'query' }),
  chunking_settings: InferenceInferenceChunkingSettings.describe('The chunking configuration object. Applies only to the `text_embedding` task type. Not applicable to the `rerank`, `completion`, or `chat_completion` task types.').optional().meta({ found_in: 'body' }),
  service: InferenceNvidiaServiceType.describe('The type of service supported for the specified task type. In this case, `nvidia`.').meta({ found_in: 'body' }),
  service_settings: InferenceNvidiaServiceSettings.describe('Settings used to install the inference model. These settings are specific to the `nvidia` service.').meta({ found_in: 'body' }),
  task_settings: InferenceNvidiaTaskSettings.describe('Settings to configure the inference task. Applies only to the `text_embedding` task type. Not applicable to the `rerank`, `completion`, or `chat_completion` task types. These settings are specific to the task type you specified.').optional().meta({ found_in: 'body' })
}).meta({ id: 'InferencePutNvidiaRequest' })
export type InferencePutNvidiaRequest = z.infer<typeof InferencePutNvidiaRequest>

export const InferencePutNvidiaResponse = InferenceInferenceEndpointInfoNvidia.meta({ id: 'InferencePutNvidiaResponse' })
export type InferencePutNvidiaResponse = z.infer<typeof InferencePutNvidiaResponse>

/**
 * Create an OpenAI inference endpoint.
 *
 * Create an inference endpoint to perform an inference task with the `openai` service or `openai` compatible APIs.
 */
export const InferencePutOpenaiRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceOpenAITaskType.describe('The type of the inference task that the model will perform. NOTE: The `chat_completion` task type only supports streaming and only through the _stream API.').meta({ found_in: 'path' }),
  openai_inference_id: Id.describe('The unique identifier of the inference endpoint.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference endpoint to be created.').optional().meta({ found_in: 'query' }),
  chunking_settings: InferenceInferenceChunkingSettings.describe('The chunking configuration object. Applies only to the `text_embedding` task type. Not applicable to the `completion` or `chat_completion` task types.').optional().meta({ found_in: 'body' }),
  service: InferenceOpenAIServiceType.describe('The type of service supported for the specified task type. In this case, `openai`.').meta({ found_in: 'body' }),
  service_settings: InferenceOpenAIServiceSettings.describe('Settings used to install the inference model. These settings are specific to the `openai` service.').meta({ found_in: 'body' }),
  task_settings: InferenceOpenAITaskSettings.describe('Settings to configure the inference task. These settings are specific to the task type you specified.').optional().meta({ found_in: 'body' })
}).meta({ id: 'InferencePutOpenaiRequest' })
export type InferencePutOpenaiRequest = z.infer<typeof InferencePutOpenaiRequest>

export const InferencePutOpenaiResponse = InferenceInferenceEndpointInfoOpenAI.meta({ id: 'InferencePutOpenaiResponse' })
export type InferencePutOpenaiResponse = z.infer<typeof InferencePutOpenaiResponse>

/**
 * Create an OpenShift AI inference endpoint.
 *
 * Create an inference endpoint to perform an inference task with the `openshift_ai` service.
 */
export const InferencePutOpenshiftAiRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceOpenShiftAiTaskType.describe('The type of the inference task that the model will perform. NOTE: The `chat_completion` task type only supports streaming and only through the _stream API.').meta({ found_in: 'path' }),
  openshiftai_inference_id: Id.describe('The unique identifier of the inference endpoint.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference endpoint to be created.').optional().meta({ found_in: 'query' }),
  chunking_settings: InferenceInferenceChunkingSettings.describe('The chunking configuration object. Applies only to the `text_embedding` task type. Not applicable to the `rerank`, `completion`, or `chat_completion` task types.').optional().meta({ found_in: 'body' }),
  service: InferenceOpenShiftAiServiceType.describe('The type of service supported for the specified task type. In this case, `openshift_ai`.').meta({ found_in: 'body' }),
  service_settings: InferenceOpenShiftAiServiceSettings.describe('Settings used to install the inference model. These settings are specific to the `openshift_ai` service.').meta({ found_in: 'body' }),
  task_settings: InferenceOpenShiftAiTaskSettings.describe('Settings to configure the inference task. Applies only to the `rerank` task type. Not applicable to the `text_embedding`, `completion`, or `chat_completion` task types. These settings are specific to the task type you specified.').optional().meta({ found_in: 'body' })
}).meta({ id: 'InferencePutOpenshiftAiRequest' })
export type InferencePutOpenshiftAiRequest = z.infer<typeof InferencePutOpenshiftAiRequest>

export const InferencePutOpenshiftAiResponse = InferenceInferenceEndpointInfoOpenShiftAi.meta({ id: 'InferencePutOpenshiftAiResponse' })
export type InferencePutOpenshiftAiResponse = z.infer<typeof InferencePutOpenshiftAiResponse>

/**
 * Create a VoyageAI inference endpoint.
 *
 * Create an inference endpoint to perform an inference task with the `voyageai` service.
 *
 * Avoid creating multiple endpoints for the same model unless required, as each endpoint consumes significant resources.
 */
export const InferencePutVoyageaiRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceVoyageAITaskType.describe('The type of the inference task that the model will perform.').meta({ found_in: 'path' }),
  voyageai_inference_id: Id.describe('The unique identifier of the inference endpoint.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference endpoint to be created.').optional().meta({ found_in: 'query' }),
  chunking_settings: InferenceInferenceChunkingSettings.describe('The chunking configuration object. Applies only to the `text_embedding` task type. Not applicable to the `rerank` task type.').optional().meta({ found_in: 'body' }),
  service: InferenceVoyageAIServiceType.describe('The type of service supported for the specified task type. In this case, `voyageai`.').meta({ found_in: 'body' }),
  service_settings: InferenceVoyageAIServiceSettings.describe('Settings used to install the inference model. These settings are specific to the `voyageai` service.').meta({ found_in: 'body' }),
  task_settings: InferenceVoyageAITaskSettings.describe('Settings to configure the inference task. These settings are specific to the task type you specified.').optional().meta({ found_in: 'body' })
}).meta({ id: 'InferencePutVoyageaiRequest' })
export type InferencePutVoyageaiRequest = z.infer<typeof InferencePutVoyageaiRequest>

export const InferencePutVoyageaiResponse = InferenceInferenceEndpointInfoVoyageAI.meta({ id: 'InferencePutVoyageaiResponse' })
export type InferencePutVoyageaiResponse = z.infer<typeof InferencePutVoyageaiResponse>

/**
 * Create a Watsonx inference endpoint.
 *
 * Create an inference endpoint to perform an inference task with the `watsonxai` service.
 * You need an IBM Cloud Databases for Elasticsearch deployment to use the `watsonxai` inference service.
 * You can provision one through the IBM catalog, the Cloud Databases CLI plug-in, the Cloud Databases API, or Terraform.
 */
export const InferencePutWatsonxRequest = z.object({
  ...RequestBase.shape,
  task_type: InferenceWatsonxTaskType.describe('The type of the inference task that the model will perform.').meta({ found_in: 'path' }),
  watsonx_inference_id: Id.describe('The unique identifier of the inference endpoint.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference endpoint to be created.').optional().meta({ found_in: 'query' }),
  chunking_settings: InferenceInferenceChunkingSettings.describe('The chunking configuration object. Applies only to the `text_embedding` task type. Not applicable to the `rerank`, `completion` or `chat_completion` task types.').optional().meta({ found_in: 'body' }),
  service: InferenceWatsonxServiceType.describe('The type of service supported for the specified task type. In this case, `watsonxai`.').meta({ found_in: 'body' }),
  service_settings: InferenceWatsonxServiceSettings.describe('Settings used to install the inference model. These settings are specific to the `watsonxai` service.').meta({ found_in: 'body' })
}).meta({ id: 'InferencePutWatsonxRequest' })
export type InferencePutWatsonxRequest = z.infer<typeof InferencePutWatsonxRequest>

export const InferencePutWatsonxResponse = InferenceInferenceEndpointInfoWatsonx.meta({ id: 'InferencePutWatsonxResponse' })
export type InferencePutWatsonxResponse = z.infer<typeof InferencePutWatsonxResponse>

/** Perform reranking inference on the service. */
export const InferenceRerankRequest = z.object({
  ...RequestBase.shape,
  inference_id: Id.describe('The unique identifier for the inference endpoint.').meta({ found_in: 'path' }),
  timeout: Duration.describe('The amount of time to wait for the inference request to complete.').optional().meta({ found_in: 'query' }),
  query: z.string().describe('Query input.').meta({ found_in: 'body' }),
  input: z.array(z.string()).describe('The documents to rank.').meta({ found_in: 'body' }),
  return_documents: z.boolean().describe('Include the document text in the response.').optional().meta({ found_in: 'body' }),
  top_n: integer.describe('Limit the response to the top N documents.').optional().meta({ found_in: 'body' }),
  task_settings: InferenceTaskSettings.describe('Task settings for the individual inference request. These settings are specific to the task type you specified and override the task settings specified when initializing the service.').optional().meta({ found_in: 'body' })
}).meta({ id: 'InferenceRerankRequest' })
export type InferenceRerankRequest = z.infer<typeof InferenceRerankRequest>

export const InferenceRerankResponse = InferenceRerankedInferenceResult.meta({ id: 'InferenceRerankResponse' })
export type InferenceRerankResponse = z.infer<typeof InferenceRerankResponse>

/** Perform sparse embedding inference on the service. */
export const InferenceSparseEmbeddingRequest = z.object({
  ...RequestBase.shape,
  inference_id: Id.describe('The inference Id').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference request to complete.').optional().meta({ found_in: 'query' }),
  input: z.union([z.string(), z.array(z.string())]).describe('Inference input. Either a string or an array of strings.').meta({ found_in: 'body' }),
  task_settings: InferenceTaskSettings.describe('Task settings for the individual inference request. These settings are specific to the <task_type> you specified and override the task settings specified when initializing the service.').optional().meta({ found_in: 'body' })
}).meta({ id: 'InferenceSparseEmbeddingRequest' })
export type InferenceSparseEmbeddingRequest = z.infer<typeof InferenceSparseEmbeddingRequest>

export const InferenceSparseEmbeddingResponse = InferenceSparseEmbeddingInferenceResult.meta({ id: 'InferenceSparseEmbeddingResponse' })
export type InferenceSparseEmbeddingResponse = z.infer<typeof InferenceSparseEmbeddingResponse>

/**
 * Perform streaming completion inference on the service.
 *
 * Get real-time responses for completion tasks by delivering answers incrementally, reducing response times during computation.
 * This API works only with the completion task type.
 *
 * IMPORTANT: The inference APIs enable you to use certain services, such as built-in machine learning models (ELSER, E5), models uploaded through Eland, Cohere, OpenAI, Azure, Google AI Studio, Google Vertex AI, Anthropic, Watsonx.ai, or Hugging Face. For built-in models and models uploaded through Eland, the inference APIs offer an alternative way to use and manage trained models. However, if you do not plan to use the inference APIs to use these models or if you want to use non-NLP models, use the machine learning trained model APIs.
 *
 * This API requires the `monitor_inference` cluster privilege (the built-in `inference_admin` and `inference_user` roles grant this privilege). You must use a client that supports streaming.
 */
export const InferenceStreamCompletionRequest = z.object({
  ...RequestBase.shape,
  inference_id: Id.describe('The unique identifier for the inference endpoint.').meta({ found_in: 'path' }),
  timeout: Duration.describe('The amount of time to wait for the inference request to complete.').optional().meta({ found_in: 'query' }),
  input: z.union([z.string(), z.array(z.string())]).describe('The text on which you want to perform the inference task. It can be a single string or an array. NOTE: Inference endpoints for the completion task type currently only support a single string as input.').meta({ found_in: 'body' }),
  task_settings: InferenceTaskSettings.describe('Task settings for the individual inference request. These settings are specific to the <task_type> you specified and override the task settings specified when initializing the service.').optional().meta({ found_in: 'body' })
}).meta({ id: 'InferenceStreamCompletionRequest' })
export type InferenceStreamCompletionRequest = z.infer<typeof InferenceStreamCompletionRequest>

export const InferenceStreamCompletionResponse = StreamResult.meta({ id: 'InferenceStreamCompletionResponse' })
export type InferenceStreamCompletionResponse = z.infer<typeof InferenceStreamCompletionResponse>

/** Perform text embedding inference on the service. */
export const InferenceTextEmbeddingRequest = z.object({
  ...RequestBase.shape,
  inference_id: Id.describe('The inference Id').meta({ found_in: 'path' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the inference request to complete.').optional().meta({ found_in: 'query' }),
  input: z.union([z.string(), z.array(z.string())]).describe('Inference input. Either a string or an array of strings.').meta({ found_in: 'body' }),
  input_type: z.string().describe('The input data type for the text embedding model. Possible values include: * `SEARCH` * `INGEST` * `CLASSIFICATION` * `CLUSTERING` Not all services support all values. Unsupported values will trigger a validation exception. Accepted values depend on the configured inference service, refer to the relevant service-specific documentation for more info. > info > The `input_type` parameter specified on the root level of the request body will take precedence over the `input_type` parameter specified in `task_settings`.').optional().meta({ found_in: 'body' }),
  task_settings: InferenceTaskSettings.describe('Task settings for the individual inference request. These settings are specific to the <task_type> you specified and override the task settings specified when initializing the service.').optional().meta({ found_in: 'body' })
}).meta({ id: 'InferenceTextEmbeddingRequest' })
export type InferenceTextEmbeddingRequest = z.infer<typeof InferenceTextEmbeddingRequest>

export const InferenceTextEmbeddingResponse = InferenceTextEmbeddingInferenceResult.meta({ id: 'InferenceTextEmbeddingResponse' })
export type InferenceTextEmbeddingResponse = z.infer<typeof InferenceTextEmbeddingResponse>

/**
 * Update an inference endpoint.
 *
 * Modify `task_settings`, secrets (within `service_settings`), or `num_allocations` for an inference endpoint, depending on the specific endpoint service and `task_type`.
 *
 * IMPORTANT: The inference APIs enable you to use certain services, such as built-in machine learning models (ELSER, E5), models uploaded through Eland, Cohere, OpenAI, Azure, Google AI Studio, Google Vertex AI, Anthropic, Watsonx.ai, or Hugging Face.
 * For built-in models and models uploaded through Eland, the inference APIs offer an alternative way to use and manage trained models.
 * However, if you do not plan to use the inference APIs to use these models or if you want to use non-NLP models, use the machine learning trained model APIs.
 */
export const InferenceUpdateRequest = z.object({
  ...RequestBase.shape,
  inference_id: Id.describe('The unique identifier of the inference endpoint.').meta({ found_in: 'path' }),
  task_type: InferenceTaskType.describe('The type of inference task that the model performs.').optional().meta({ found_in: 'path' }),
  inference_config: InferenceInferenceEndpoint.optional().meta({ found_in: 'body' })
}).meta({ id: 'InferenceUpdateRequest' })
export type InferenceUpdateRequest = z.infer<typeof InferenceUpdateRequest>

export const InferenceUpdateResponse = InferenceInferenceEndpointInfo.meta({ id: 'InferenceUpdateResponse' })
export type InferenceUpdateResponse = z.infer<typeof InferenceUpdateResponse>
