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
 * Generated at: 2025-11-27T07:43:24.902Z
 * Source: elasticsearch-specification repository, operations: ml-start-trained-model-deployment
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_start_trained_model_deployment_request,
  ml_start_trained_model_deployment_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_START_TRAINED_MODEL_DEPLOYMENT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.start_trained_model_deployment',
  connectorGroup: 'internal',
  summary: `Start a trained model deployment`,
  description: `Start a trained model deployment.

It allocates the model to every machine learning node.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-start-trained-model-deployment`,
  methods: ['POST'],
  patterns: ['_ml/trained_models/{model_id}/deployment/_start'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-start-trained-model-deployment',
  parameterTypes: {
    headerParams: [],
    pathParams: ['model_id'],
    urlParams: [
      'cache_size',
      'deployment_id',
      'number_of_allocations',
      'priority',
      'queue_capacity',
      'threads_per_allocation',
      'timeout',
      'wait_for',
    ],
    bodyParams: ['adaptive_allocations'],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_start_trained_model_deployment_request, 'body'),
    ...getShapeAt(ml_start_trained_model_deployment_request, 'path'),
    ...getShapeAt(ml_start_trained_model_deployment_request, 'query'),
  }),
  outputSchema: ml_start_trained_model_deployment_response,
};
