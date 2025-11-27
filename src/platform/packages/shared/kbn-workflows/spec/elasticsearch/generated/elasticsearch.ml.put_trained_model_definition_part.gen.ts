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
 * Source: elasticsearch-specification repository, operations: ml-put-trained-model-definition-part
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_put_trained_model_definition_part_request,
  ml_put_trained_model_definition_part_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_PUT_TRAINED_MODEL_DEFINITION_PART_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.put_trained_model_definition_part',
  connectorGroup: 'internal',
  summary: `Create part of a trained model definition`,
  description: `Create part of a trained model definition.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-trained-model-definition-part`,
  methods: ['PUT'],
  patterns: ['_ml/trained_models/{model_id}/definition/{part}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-trained-model-definition-part',
  parameterTypes: {
    headerParams: [],
    pathParams: ['model_id', 'part'],
    urlParams: [],
    bodyParams: ['definition', 'total_definition_length', 'total_parts'],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_put_trained_model_definition_part_request, 'body'),
    ...getShapeAt(ml_put_trained_model_definition_part_request, 'path'),
    ...getShapeAt(ml_put_trained_model_definition_part_request, 'query'),
  }),
  outputSchema: ml_put_trained_model_definition_part_response,
};
