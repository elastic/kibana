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
 * Source: elasticsearch-specification repository, operations: ml-get-trained-models-stats, ml-get-trained-models-stats-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_get_trained_models_stats1_request,
  ml_get_trained_models_stats1_response,
  ml_get_trained_models_stats_request,
  ml_get_trained_models_stats_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_GET_TRAINED_MODELS_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_trained_models_stats',
  summary: `Get trained models usage info`,
  description: `Get trained models usage info.

You can get usage information for multiple trained
models in a single API request by using a comma-separated list of model IDs or a wildcard expression.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-trained-models-stats`,
  methods: ['GET'],
  patterns: ['_ml/trained_models/{model_id}/_stats', '_ml/trained_models/_stats'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-trained-models-stats',
  parameterTypes: {
    headerParams: [],
    pathParams: ['model_id'],
    urlParams: ['allow_no_match', 'from', 'size'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(ml_get_trained_models_stats_request, 'body'),
      ...getShapeAt(ml_get_trained_models_stats_request, 'path'),
      ...getShapeAt(ml_get_trained_models_stats_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ml_get_trained_models_stats1_request, 'body'),
      ...getShapeAt(ml_get_trained_models_stats1_request, 'path'),
      ...getShapeAt(ml_get_trained_models_stats1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    ml_get_trained_models_stats_response,
    ml_get_trained_models_stats1_response,
  ]),
};
