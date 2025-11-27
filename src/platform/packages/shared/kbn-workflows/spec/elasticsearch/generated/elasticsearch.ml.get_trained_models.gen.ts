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
 * Source: elasticsearch-specification repository, operations: ml-get-trained-models, ml-get-trained-models-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_get_trained_models1_request,
  ml_get_trained_models1_response,
  ml_get_trained_models_request,
  ml_get_trained_models_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_GET_TRAINED_MODELS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_trained_models',
  connectorGroup: 'internal',
  summary: `Get trained model configuration info`,
  description: `Get trained model configuration info.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-trained-models`,
  methods: ['GET'],
  patterns: ['_ml/trained_models/{model_id}', '_ml/trained_models'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-trained-models',
  parameterTypes: {
    headerParams: [],
    pathParams: ['model_id'],
    urlParams: [
      'allow_no_match',
      'decompress_definition',
      'exclude_generated',
      'from',
      'include',
      'size',
      'tags',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(ml_get_trained_models_request, 'body'),
      ...getShapeAt(ml_get_trained_models_request, 'path'),
      ...getShapeAt(ml_get_trained_models_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ml_get_trained_models1_request, 'body'),
      ...getShapeAt(ml_get_trained_models1_request, 'path'),
      ...getShapeAt(ml_get_trained_models1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([ml_get_trained_models_response, ml_get_trained_models1_response]),
};
