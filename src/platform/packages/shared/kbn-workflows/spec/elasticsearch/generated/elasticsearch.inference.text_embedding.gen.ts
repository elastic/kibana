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
 * Generated at: 2025-11-27T07:04:28.230Z
 * Source: elasticsearch-specification repository, operations: inference-text-embedding
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  inference_text_embedding_request,
  inference_text_embedding_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INFERENCE_TEXT_EMBEDDING_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.inference.text_embedding',
  connectorGroup: 'internal',
  summary: `Perform text embedding inference on the service`,
  description: `Perform text embedding inference on the service.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-inference`,
  methods: ['POST'],
  patterns: ['_inference/text_embedding/{inference_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-inference',
  parameterTypes: {
    headerParams: [],
    pathParams: ['inference_id'],
    urlParams: ['timeout'],
    bodyParams: ['input', 'input_type', 'task_settings'],
  },
  paramsSchema: z.object({
    ...getShapeAt(inference_text_embedding_request, 'body'),
    ...getShapeAt(inference_text_embedding_request, 'path'),
    ...getShapeAt(inference_text_embedding_request, 'query'),
  }),
  outputSchema: inference_text_embedding_response,
};
