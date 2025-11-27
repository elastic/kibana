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
 * Generated at: 2025-11-27T07:43:24.901Z
 * Source: elasticsearch-specification repository, operations: ml-put-trained-model
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ml_put_trained_model_request, ml_put_trained_model_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_PUT_TRAINED_MODEL_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.put_trained_model',
  connectorGroup: 'internal',
  summary: `Create a trained model`,
  description: `Create a trained model.

Enable you to supply a trained model that is not created by data frame analytics.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-trained-model`,
  methods: ['PUT'],
  patterns: ['_ml/trained_models/{model_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-trained-model',
  parameterTypes: {
    headerParams: [],
    pathParams: ['model_id'],
    urlParams: ['defer_definition_decompression', 'wait_for_completion'],
    bodyParams: [
      'compressed_definition',
      'definition',
      'description',
      'inference_config',
      'input',
      'metadata',
      'model_type',
      'model_size_bytes',
      'platform_architecture',
      'tags',
      'prefix_strings',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_put_trained_model_request, 'body'),
    ...getShapeAt(ml_put_trained_model_request, 'path'),
    ...getShapeAt(ml_put_trained_model_request, 'query'),
  }),
  outputSchema: ml_put_trained_model_response,
};
