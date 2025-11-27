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
 * Generated at: 2025-11-27T07:43:24.887Z
 * Source: elasticsearch-specification repository, operations: inference-put-azureopenai
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  inference_put_azureopenai_request,
  inference_put_azureopenai_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INFERENCE_PUT_AZUREOPENAI_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put_azureopenai',
  connectorGroup: 'internal',
  summary: `Create an Azure OpenAI inference endpoint`,
  description: `Create an Azure OpenAI inference endpoint.

Create an inference endpoint to perform an inference task with the \`azureopenai\` service.

The list of chat completion models that you can choose from in your Azure OpenAI deployment include:

* [GPT-4 and GPT-4 Turbo models](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models?tabs=global-standard%2Cstandard-chat-completions#gpt-4-and-gpt-4-turbo-models)
* [GPT-3.5](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models?tabs=global-standard%2Cstandard-chat-completions#gpt-35)

The list of embeddings models that you can choose from in your deployment can be found in the [Azure models documentation](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models?tabs=global-standard%2Cstandard-chat-completions#embeddings).

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-azureopenai`,
  methods: ['PUT'],
  patterns: ['_inference/{task_type}/{azureopenai_inference_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-azureopenai',
  parameterTypes: {
    headerParams: [],
    pathParams: ['task_type', 'azureopenai_inference_id'],
    urlParams: ['timeout'],
    bodyParams: ['chunking_settings', 'service', 'service_settings', 'task_settings'],
  },
  paramsSchema: z.object({
    ...getShapeAt(inference_put_azureopenai_request, 'body'),
    ...getShapeAt(inference_put_azureopenai_request, 'path'),
    ...getShapeAt(inference_put_azureopenai_request, 'query'),
  }),
  outputSchema: inference_put_azureopenai_response,
};
