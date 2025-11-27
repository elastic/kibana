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
 * Source: elasticsearch-specification repository, operations: ml-put-trained-model-alias
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_put_trained_model_alias_request,
  ml_put_trained_model_alias_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_PUT_TRAINED_MODEL_ALIAS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.put_trained_model_alias',
  connectorGroup: 'internal',
  summary: `Create or update a trained model alias`,
  description: `Create or update a trained model alias.

A trained model alias is a logical name used to reference a single trained
model.
You can use aliases instead of trained model identifiers to make it easier to
reference your models. For example, you can use aliases in inference
aggregations and processors.
An alias must be unique and refer to only a single trained model. However,
you can have multiple aliases for each trained model.
If you use this API to update an alias such that it references a different
trained model ID and the model uses a different type of data frame analytics,
an error occurs. For example, this situation occurs if you have a trained
model for regression analysis and a trained model for classification
analysis; you cannot reassign an alias from one type of trained model to
another.
If you use this API to update an alias and there are very few input fields in
common between the old and new trained models for the model alias, the API
returns a warning.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-trained-model-alias`,
  methods: ['PUT'],
  patterns: ['_ml/trained_models/{model_id}/model_aliases/{model_alias}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-trained-model-alias',
  parameterTypes: {
    headerParams: [],
    pathParams: ['model_id', 'model_alias'],
    urlParams: ['reassign'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_put_trained_model_alias_request, 'body'),
    ...getShapeAt(ml_put_trained_model_alias_request, 'path'),
    ...getShapeAt(ml_put_trained_model_alias_request, 'query'),
  }),
  outputSchema: ml_put_trained_model_alias_response,
};
