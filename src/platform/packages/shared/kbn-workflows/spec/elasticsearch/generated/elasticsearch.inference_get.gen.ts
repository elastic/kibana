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
 * Source: elasticsearch-specification repository, operations: inference-get, inference-get-1, inference-get-2
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  inference_get1_request,
  inference_get1_response,
  inference_get2_request,
  inference_get2_response,
  inference_get_request,
  inference_get_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INFERENCE_GET_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.get',
  summary: `Get an inference endpoint`,
  description: `Get an inference endpoint.

This API requires the \`monitor_inference\` cluster privilege (the built-in \`inference_admin\` and \`inference_user\` roles grant this privilege).

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-get`,
  methods: ['GET'],
  patterns: ['_inference', '_inference/{inference_id}', '_inference/{task_type}/{inference_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-get',
  parameterTypes: {
    headerParams: [],
    pathParams: ['inference_id', 'task_type'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(inference_get_request, 'body'),
      ...getShapeAt(inference_get_request, 'path'),
      ...getShapeAt(inference_get_request, 'query'),
    }),
    z.object({
      ...getShapeAt(inference_get1_request, 'body'),
      ...getShapeAt(inference_get1_request, 'path'),
      ...getShapeAt(inference_get1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(inference_get2_request, 'body'),
      ...getShapeAt(inference_get2_request, 'path'),
      ...getShapeAt(inference_get2_request, 'query'),
    }),
  ]),
  outputSchema: z.union([inference_get_response, inference_get1_response, inference_get2_response]),
};
