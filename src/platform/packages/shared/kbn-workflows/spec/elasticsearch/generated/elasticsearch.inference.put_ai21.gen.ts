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
 * Generated at: 2025-11-27T07:43:24.886Z
 * Source: elasticsearch-specification repository, operations: inference-put-ai21
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { inference_put_ai21_request, inference_put_ai21_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INFERENCE_PUT_AI21_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.put_ai21',
  connectorGroup: 'internal',
  summary: `Create a AI21 inference endpoint`,
  description: `Create a AI21 inference endpoint.

Create an inference endpoint to perform an inference task with the \`ai21\` service.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-ai21`,
  methods: ['PUT'],
  patterns: ['_inference/{task_type}/{ai21_inference_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-put-ai21',
  parameterTypes: {
    headerParams: [],
    pathParams: ['task_type', 'ai21_inference_id'],
    urlParams: ['timeout'],
    bodyParams: ['service', 'service_settings'],
  },
  paramsSchema: z.object({
    ...getShapeAt(inference_put_ai21_request, 'body'),
    ...getShapeAt(inference_put_ai21_request, 'path'),
    ...getShapeAt(inference_put_ai21_request, 'query'),
  }),
  outputSchema: inference_put_ai21_response,
};
