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
 * Generated at: 2025-11-27T07:04:28.237Z
 * Source: elasticsearch-specification repository, operations: ml-put-data-frame-analytics
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_put_data_frame_analytics_request,
  ml_put_data_frame_analytics_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_PUT_DATA_FRAME_ANALYTICS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.put_data_frame_analytics',
  connectorGroup: 'internal',
  summary: `Create a data frame analytics job`,
  description: `Create a data frame analytics job.

This API creates a data frame analytics job that performs an analysis on the
source indices and stores the outcome in a destination index.
By default, the query used in the source configuration is \`{"match_all": {}}\`.

If the destination index does not exist, it is created automatically when you start the job.

If you supply only a subset of the regression or classification parameters, hyperparameter optimization occurs. It determines a value for each of the undefined parameters.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-data-frame-analytics`,
  methods: ['PUT'],
  patterns: ['_ml/data_frame/analytics/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-put-data-frame-analytics',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [
      'allow_lazy_start',
      'analysis',
      'analyzed_fields',
      'description',
      'dest',
      'max_num_threads',
      '_meta',
      'model_memory_limit',
      'source',
      'headers',
      'version',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_put_data_frame_analytics_request, 'body'),
    ...getShapeAt(ml_put_data_frame_analytics_request, 'path'),
    ...getShapeAt(ml_put_data_frame_analytics_request, 'query'),
  }),
  outputSchema: ml_put_data_frame_analytics_response,
};
