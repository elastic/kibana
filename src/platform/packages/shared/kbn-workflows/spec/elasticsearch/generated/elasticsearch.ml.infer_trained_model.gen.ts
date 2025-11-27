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
 * Generated at: 2025-11-27T07:04:28.236Z
 * Source: elasticsearch-specification repository, operations: ml-infer-trained-model
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_infer_trained_model_request,
  ml_infer_trained_model_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_INFER_TRAINED_MODEL_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.infer_trained_model',
  connectorGroup: 'internal',
  summary: `Evaluate a trained model`,
  description: `Evaluate a trained model.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-infer-trained-model`,
  methods: ['POST'],
  patterns: ['_ml/trained_models/{model_id}/_infer'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-infer-trained-model',
  parameterTypes: {
    headerParams: [],
    pathParams: ['model_id'],
    urlParams: ['timeout'],
    bodyParams: ['docs', 'inference_config'],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_infer_trained_model_request, 'body'),
    ...getShapeAt(ml_infer_trained_model_request, 'path'),
    ...getShapeAt(ml_infer_trained_model_request, 'query'),
  }),
  outputSchema: ml_infer_trained_model_response,
};
