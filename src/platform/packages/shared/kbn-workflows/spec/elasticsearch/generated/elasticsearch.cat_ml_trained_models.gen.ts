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
 * Source: elasticsearch-specification repository, operations: cat-ml-trained-models, cat-ml-trained-models-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  cat_ml_trained_models1_request,
  cat_ml_trained_models1_response,
  cat_ml_trained_models_request,
  cat_ml_trained_models_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CAT_ML_TRAINED_MODELS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.ml_trained_models',
  summary: `Get trained models`,
  description: `Get trained models.

Get configuration and usage information about inference trained models.

IMPORTANT: CAT APIs are only intended for human consumption using the Kibana
console or command line. They are not intended for use by applications. For
application consumption, use the get trained models statistics API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-ml-trained-models`,
  methods: ['GET'],
  patterns: ['_cat/ml/trained_models', '_cat/ml/trained_models/{model_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-ml-trained-models',
  parameterTypes: {
    headerParams: [],
    pathParams: ['model_id'],
    urlParams: ['allow_no_match', 'h', 's', 'from', 'size'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(cat_ml_trained_models_request, 'body'),
      ...getShapeAt(cat_ml_trained_models_request, 'path'),
      ...getShapeAt(cat_ml_trained_models_request, 'query'),
    }),
    z.object({
      ...getShapeAt(cat_ml_trained_models1_request, 'body'),
      ...getShapeAt(cat_ml_trained_models1_request, 'path'),
      ...getShapeAt(cat_ml_trained_models1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([cat_ml_trained_models_response, cat_ml_trained_models1_response]),
};
