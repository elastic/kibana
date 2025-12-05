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
 * Source: elasticsearch-specification repository, operations: ml-put-trained-model-vocabulary
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_put_trained_model_vocabulary_request,
  ml_put_trained_model_vocabulary_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_PUT_TRAINED_MODEL_VOCABULARY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.put_trained_model_vocabulary',
  summary: `Create a trained model vocabulary`,
  description: `Create a trained model vocabulary.

This API is supported only for natural language processing (NLP) models.
The vocabulary is stored in the index as described in \`inference_config.*.vocabulary\` of the trained model definition.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-trained-model-vocabulary`,
  methods: ['PUT'],
  patterns: ['_ml/trained_models/{model_id}/vocabulary'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-trained-model-vocabulary',
  parameterTypes: {
    headerParams: [],
    pathParams: ['model_id'],
    urlParams: [],
    bodyParams: ['vocabulary', 'merges', 'scores'],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_put_trained_model_vocabulary_request, 'body'),
    ...getShapeAt(ml_put_trained_model_vocabulary_request, 'path'),
    ...getShapeAt(ml_put_trained_model_vocabulary_request, 'query'),
  }),
  outputSchema: ml_put_trained_model_vocabulary_response,
};
