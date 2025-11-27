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
 * Generated at: 2025-11-27T07:04:28.228Z
 * Source: elasticsearch-specification repository, operations: inference-put-cohere
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { inference_put_cohere_request, inference_put_cohere_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INFERENCE_PUT_COHERE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put_cohere',
  connectorGroup: 'internal',
  summary: `Create a Cohere inference endpoint`,
  description: `Create a Cohere inference endpoint.

Create an inference endpoint to perform an inference task with the \`cohere\` service.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-cohere`,
  methods: ['PUT'],
  patterns: ['_inference/{task_type}/{cohere_inference_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-cohere',
  parameterTypes: {
    headerParams: [],
    pathParams: ['task_type', 'cohere_inference_id'],
    urlParams: ['timeout'],
    bodyParams: ['chunking_settings', 'service', 'service_settings', 'task_settings'],
  },
  paramsSchema: z.object({
    ...getShapeAt(inference_put_cohere_request, 'body'),
    ...getShapeAt(inference_put_cohere_request, 'path'),
    ...getShapeAt(inference_put_cohere_request, 'query'),
  }),
  outputSchema: inference_put_cohere_response,
};
