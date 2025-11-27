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
 * Generated at: 2025-11-27T07:43:24.891Z
 * Source: elasticsearch-specification repository, operations: inference-update, inference-update-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  inference_update1_request,
  inference_update1_response,
  inference_update_request,
  inference_update_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INFERENCE_UPDATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.update',
  connectorGroup: 'internal',
  summary: `Update an inference endpoint`,
  description: `Update an inference endpoint.

Modify \`task_settings\`, secrets (within \`service_settings\`), or \`num_allocations\` for an inference endpoint, depending on the specific endpoint service and \`task_type\`.

IMPORTANT: The inference APIs enable you to use certain services, such as built-in machine learning models (ELSER, E5), models uploaded through Eland, Cohere, OpenAI, Azure, Google AI Studio, Google Vertex AI, Anthropic, Watsonx.ai, or Hugging Face.
For built-in models and models uploaded through Eland, the inference APIs offer an alternative way to use and manage trained models.
However, if you do not plan to use the inference APIs to use these models or if you want to use non-NLP models, use the machine learning trained model APIs.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-update`,
  methods: ['PUT'],
  patterns: ['_inference/{inference_id}/_update', '_inference/{task_type}/{inference_id}/_update'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-update',
  parameterTypes: {
    headerParams: [],
    pathParams: ['inference_id', 'task_type'],
    urlParams: [],
    bodyParams: ['chunking_settings', 'service', 'service_settings', 'task_settings'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(inference_update_request, 'body'),
      ...getShapeAt(inference_update_request, 'path'),
      ...getShapeAt(inference_update_request, 'query'),
    }),
    z.object({
      ...getShapeAt(inference_update1_request, 'body'),
      ...getShapeAt(inference_update1_request, 'path'),
      ...getShapeAt(inference_update1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([inference_update_response, inference_update1_response]),
};
