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
 * Generated at: 2025-11-27T07:04:28.226Z
 * Source: elasticsearch-specification repository, operations: inference-delete, inference-delete-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  inference_delete1_request,
  inference_delete1_response,
  inference_delete_request,
  inference_delete_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INFERENCE_DELETE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.delete',
  connectorGroup: 'internal',
  summary: `Delete an inference endpoint`,
  description: `Delete an inference endpoint.

This API requires the manage_inference cluster privilege (the built-in \`inference_admin\` role grants this privilege).

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-delete`,
  methods: ['DELETE'],
  patterns: ['_inference/{inference_id}', '_inference/{task_type}/{inference_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-delete',
  parameterTypes: {
    headerParams: [],
    pathParams: ['inference_id', 'task_type'],
    urlParams: ['dry_run', 'force'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(inference_delete_request, 'body'),
      ...getShapeAt(inference_delete_request, 'path'),
      ...getShapeAt(inference_delete_request, 'query'),
    }),
    z.object({
      ...getShapeAt(inference_delete1_request, 'body'),
      ...getShapeAt(inference_delete1_request, 'path'),
      ...getShapeAt(inference_delete1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([inference_delete_response, inference_delete1_response]),
};
