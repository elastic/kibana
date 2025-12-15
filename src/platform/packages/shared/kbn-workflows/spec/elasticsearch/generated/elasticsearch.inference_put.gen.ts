/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * AUTO-GENERATED FILE - DO NOT EDIT
 *
 * Source: elasticsearch-specification repository, operations: inference-put, inference-put-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  inference_put1_request,
  inference_put1_response,
  inference_put_request,
  inference_put_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INFERENCE_PUT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put',
  summary: `Create an inference endpoint`,
  description: `Create an inference endpoint.

IMPORTANT: The inference APIs enable you to use certain services, such as built-in machine learning models (ELSER, E5), models uploaded through Eland, Cohere, OpenAI, Mistral, Azure OpenAI, Google AI Studio, Google Vertex AI, Anthropic, Watsonx.ai, or Hugging Face.
For built-in models and models uploaded through Eland, the inference APIs offer an alternative way to use and manage trained models.
However, if you do not plan to use the inference APIs to use these models or if you want to use non-NLP models, use the machine learning trained model APIs.

The following integrations are available through the inference API. You can find the available task types next to the integration name:
* AI21 (\`chat_completion\`, \`completion\`)
* AlibabaCloud AI Search (\`completion\`, \`rerank\`, \`sparse_embedding\`, \`text_embedding\`)
* Amazon Bedrock (\`completion\`, \`text_embedding\`)
* Amazon SageMaker (\`chat_completion\`, \`completion\`, \`rerank\`, \`sparse_embedding\`, \`text_embedding\`)
* Anthropic (\`completion\`)
* Azure AI Studio (\`completion\`, 'rerank', \`text_embedding\`)
* Azure OpenAI (\`completion\`, \`text_embedding\`)
* Cohere (\`completion\`, \`rerank\`, \`text_embedding\`)
* DeepSeek (\`chat_completion\`, \`completion\`)
* Elasticsearch (\`rerank\`, \`sparse_embedding\`, \`text_embedding\` - this service is for built-in models and models uploaded through Eland)
* ELSER (\`sparse_embedding\`)
* Google AI Studio (\`completion\`, \`text_embedding\`)
* Google Vertex AI (\`chat_completion\`, \`completion\`, \`rerank\`, \`text_embedding\`)
* Hugging Face (\`chat_completion\`, \`completion\`, \`rerank\`, \`text_embedding\`)
* JinaAI (\`rerank\`, \`text_embedding\`)
* Llama (\`chat_completion\`, \`completion\`, \`text_embedding\`)
* Mistral (\`chat_completion\`, \`completion\`, \`text_embedding\`)
* OpenAI (\`chat_completion\`, \`completion\`, \`text_embedding\`)
* OpenShift AI (\`chat_completion\`, \`completion\`, \`rerank\`, \`text_embedding\`)
* VoyageAI (\`rerank\`, \`text_embedding\`)
* Watsonx inference integration (\`text_embedding\`)

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put`,
  methods: ['PUT'],
  patterns: ['_inference/{inference_id}', '_inference/{task_type}/{inference_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put',
  parameterTypes: {
    headerParams: [],
    pathParams: ['inference_id', 'task_type'],
    urlParams: ['timeout'],
    bodyParams: ['chunking_settings', 'service', 'service_settings', 'task_settings'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(inference_put_request, 'body'),
      ...getShapeAt(inference_put_request, 'path'),
      ...getShapeAt(inference_put_request, 'query'),
    }),
    z.object({
      ...getShapeAt(inference_put1_request, 'body'),
      ...getShapeAt(inference_put1_request, 'path'),
      ...getShapeAt(inference_put1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([inference_put_response, inference_put1_response]),
};
