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
 * Source: elasticsearch-specification repository, operations: inference-sparse-embedding
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  inference_sparse_embedding_request,
  inference_sparse_embedding_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INFERENCE_SPARSE_EMBEDDING_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.sparse_embedding',
  summary: `Perform sparse embedding inference on the service`,
  description: `Perform sparse embedding inference on the service.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-inference`,
  methods: ['POST'],
  patterns: ['_inference/sparse_embedding/{inference_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-inference',
  parameterTypes: {
    headerParams: [],
    pathParams: ['inference_id'],
    urlParams: ['timeout'],
    bodyParams: ['input', 'task_settings'],
  },
  paramsSchema: z.object({
    ...getShapeAt(inference_sparse_embedding_request, 'body'),
    ...getShapeAt(inference_sparse_embedding_request, 'path'),
    ...getShapeAt(inference_sparse_embedding_request, 'query'),
  }),
  outputSchema: inference_sparse_embedding_response,
};
