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
 * Generated at: 2025-11-27T07:04:28.232Z
 * Source: elasticsearch-specification repository, operations: ml-clear-trained-model-deployment-cache
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_clear_trained_model_deployment_cache_request,
  ml_clear_trained_model_deployment_cache_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_CLEAR_TRAINED_MODEL_DEPLOYMENT_CACHE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.clear_trained_model_deployment_cache',
  connectorGroup: 'internal',
  summary: `Clear trained model deployment cache`,
  description: `Clear trained model deployment cache.

Cache will be cleared on all nodes where the trained model is assigned.
A trained model deployment may have an inference cache enabled.
As requests are handled by each allocated node, their responses may be cached on that individual node.
Calling this API clears the caches without restarting the deployment.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-clear-trained-model-deployment-cache`,
  methods: ['POST'],
  patterns: ['_ml/trained_models/{model_id}/deployment/cache/_clear'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-clear-trained-model-deployment-cache',
  parameterTypes: {
    headerParams: [],
    pathParams: ['model_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_clear_trained_model_deployment_cache_request, 'body'),
    ...getShapeAt(ml_clear_trained_model_deployment_cache_request, 'path'),
    ...getShapeAt(ml_clear_trained_model_deployment_cache_request, 'query'),
  }),
  outputSchema: ml_clear_trained_model_deployment_cache_response,
};
