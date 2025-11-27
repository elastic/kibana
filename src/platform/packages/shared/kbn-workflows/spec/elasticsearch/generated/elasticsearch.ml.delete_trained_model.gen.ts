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
 * Generated at: 2025-11-27T07:43:24.896Z
 * Source: elasticsearch-specification repository, operations: ml-delete-trained-model
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_delete_trained_model_request,
  ml_delete_trained_model_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_DELETE_TRAINED_MODEL_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.delete_trained_model',
  connectorGroup: 'internal',
  summary: `Delete an unreferenced trained model`,
  description: `Delete an unreferenced trained model.

The request deletes a trained inference model that is not referenced by an ingest pipeline.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-trained-model`,
  methods: ['DELETE'],
  patterns: ['_ml/trained_models/{model_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-trained-model',
  parameterTypes: {
    headerParams: [],
    pathParams: ['model_id'],
    urlParams: ['force', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_delete_trained_model_request, 'body'),
    ...getShapeAt(ml_delete_trained_model_request, 'path'),
    ...getShapeAt(ml_delete_trained_model_request, 'query'),
  }),
  outputSchema: ml_delete_trained_model_response,
};
