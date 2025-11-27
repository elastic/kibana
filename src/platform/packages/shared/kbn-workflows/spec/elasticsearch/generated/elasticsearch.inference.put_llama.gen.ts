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
 * Generated at: 2025-11-27T07:04:28.229Z
 * Source: elasticsearch-specification repository, operations: inference-put-llama
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { inference_put_llama_request, inference_put_llama_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INFERENCE_PUT_LLAMA_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put_llama',
  connectorGroup: 'internal',
  summary: `Create a Llama inference endpoint`,
  description: `Create a Llama inference endpoint.

Create an inference endpoint to perform an inference task with the \`llama\` service.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-llama`,
  methods: ['PUT'],
  patterns: ['_inference/{task_type}/{llama_inference_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-llama',
  parameterTypes: {
    headerParams: [],
    pathParams: ['task_type', 'llama_inference_id'],
    urlParams: ['timeout'],
    bodyParams: ['chunking_settings', 'service', 'service_settings'],
  },
  paramsSchema: z.object({
    ...getShapeAt(inference_put_llama_request, 'body'),
    ...getShapeAt(inference_put_llama_request, 'path'),
    ...getShapeAt(inference_put_llama_request, 'query'),
  }),
  outputSchema: inference_put_llama_response,
};
