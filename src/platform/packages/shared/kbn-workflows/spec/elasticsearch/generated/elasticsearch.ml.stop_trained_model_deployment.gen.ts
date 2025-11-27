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
 * Generated at: 2025-11-27T07:04:28.239Z
 * Source: elasticsearch-specification repository, operations: ml-stop-trained-model-deployment
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_stop_trained_model_deployment_request,
  ml_stop_trained_model_deployment_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_STOP_TRAINED_MODEL_DEPLOYMENT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.stop_trained_model_deployment',
  connectorGroup: 'internal',
  summary: `Stop a trained model deployment`,
  description: `Stop a trained model deployment.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-stop-trained-model-deployment`,
  methods: ['POST'],
  patterns: ['_ml/trained_models/{model_id}/deployment/_stop'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-stop-trained-model-deployment',
  parameterTypes: {
    headerParams: [],
    pathParams: ['model_id'],
    urlParams: ['allow_no_match', 'force'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_stop_trained_model_deployment_request, 'body'),
    ...getShapeAt(ml_stop_trained_model_deployment_request, 'path'),
    ...getShapeAt(ml_stop_trained_model_deployment_request, 'query'),
  }),
  outputSchema: ml_stop_trained_model_deployment_response,
};
