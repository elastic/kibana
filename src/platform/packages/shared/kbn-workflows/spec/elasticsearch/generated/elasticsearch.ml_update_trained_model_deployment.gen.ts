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
 * Source: elasticsearch-specification repository, operations: ml-update-trained-model-deployment
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_update_trained_model_deployment_request,
  ml_update_trained_model_deployment_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_UPDATE_TRAINED_MODEL_DEPLOYMENT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.update_trained_model_deployment',
  summary: `Update a trained model deployment`,
  description: `Update a trained model deployment.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-update-trained-model-deployment`,
  methods: ['POST'],
  patterns: ['_ml/trained_models/{model_id}/deployment/_update'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-update-trained-model-deployment',
  parameterTypes: {
    headerParams: [],
    pathParams: ['model_id'],
    urlParams: ['number_of_allocations'],
    bodyParams: ['number_of_allocations', 'adaptive_allocations'],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_update_trained_model_deployment_request, 'body'),
    ...getShapeAt(ml_update_trained_model_deployment_request, 'path'),
    ...getShapeAt(ml_update_trained_model_deployment_request, 'query'),
  }),
  outputSchema: ml_update_trained_model_deployment_response,
};
