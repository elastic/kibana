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
 * Generated at: 2025-11-27T07:04:28.234Z
 * Source: elasticsearch-specification repository, operations: ml-delete-trained-model-alias
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_delete_trained_model_alias_request,
  ml_delete_trained_model_alias_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_DELETE_TRAINED_MODEL_ALIAS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.delete_trained_model_alias',
  connectorGroup: 'internal',
  summary: `Delete a trained model alias`,
  description: `Delete a trained model alias.

This API deletes an existing model alias that refers to a trained model. If
the model alias is missing or refers to a model other than the one identified
by the \`model_id\`, this API returns an error.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-trained-model-alias`,
  methods: ['DELETE'],
  patterns: ['_ml/trained_models/{model_id}/model_aliases/{model_alias}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-trained-model-alias',
  parameterTypes: {
    headerParams: [],
    pathParams: ['model_id', 'model_alias'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_delete_trained_model_alias_request, 'body'),
    ...getShapeAt(ml_delete_trained_model_alias_request, 'path'),
    ...getShapeAt(ml_delete_trained_model_alias_request, 'query'),
  }),
  outputSchema: ml_delete_trained_model_alias_response,
};
