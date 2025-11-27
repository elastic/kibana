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
 * Generated at: 2025-11-27T07:43:24.888Z
 * Source: elasticsearch-specification repository, operations: inference-put-custom
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { inference_put_custom_request, inference_put_custom_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INFERENCE_PUT_CUSTOM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put_custom',
  connectorGroup: 'internal',
  summary: `Create a custom inference endpoint`,
  description: `Create a custom inference endpoint.

The custom service gives more control over how to interact with external inference services that aren't explicitly supported through dedicated integrations.
The custom service gives you the ability to define the headers, url, query parameters, request body, and secrets.
The custom service supports the template replacement functionality, which enables you to define a template that can be replaced with the value associated with that key.
Templates are portions of a string that start with \`\${\` and end with \`}\`.
The parameters \`secret_parameters\` and \`task_settings\` are checked for keys for template replacement. Template replacement is supported in the \`request\`, \`headers\`, \`url\`, and \`query_parameters\`.
If the definition (key) is not found for a template, an error message is returned.
In case of an endpoint definition like the following:
\`\`\`
PUT _inference/text_embedding/test-text-embedding
{
  "service": "custom",
  "service_settings": {
     "secret_parameters": {
          "api_key": "<some api key>"
     },
     "url": "...endpoints.huggingface.cloud/v1/embeddings",
     "headers": {
         "Authorization": "Bearer \${api_key}",
         "Content-Type": "application/json"
     },
     "request": "{\\"input\\": \${input}}",
     "response": {
         "json_parser": {
             "text_embeddings":"\$.data[*].embedding[*]"
         }
     }
  }
}
\`\`\`
To replace \`\${api_key}\` the \`secret_parameters\` and \`task_settings\` are checked for a key named \`api_key\`.

> info
> Templates should not be surrounded by quotes.

Pre-defined templates:
* \`\${input}\` refers to the array of input strings that comes from the \`input\` field of the subsequent inference requests.
* \`\${input_type}\` refers to the input type translation values.
* \`\${query}\` refers to the query field used specifically for reranking tasks.
* \`\${top_n}\` refers to the \`top_n\` field available when performing rerank requests.
* \`\${return_documents}\` refers to the \`return_documents\` field available when performing rerank requests.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-custom`,
  methods: ['PUT'],
  patterns: ['_inference/{task_type}/{custom_inference_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-custom',
  parameterTypes: {
    headerParams: [],
    pathParams: ['task_type', 'custom_inference_id'],
    urlParams: [],
    bodyParams: ['chunking_settings', 'service', 'service_settings', 'task_settings'],
  },
  paramsSchema: z.object({
    ...getShapeAt(inference_put_custom_request, 'body'),
    ...getShapeAt(inference_put_custom_request, 'path'),
    ...getShapeAt(inference_put_custom_request, 'query'),
  }),
  outputSchema: inference_put_custom_response,
};
