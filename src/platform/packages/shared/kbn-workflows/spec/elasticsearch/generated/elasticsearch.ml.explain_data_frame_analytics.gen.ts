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
 * Source: elasticsearch-specification repository, operations: ml-explain-data-frame-analytics, ml-explain-data-frame-analytics-1, ml-explain-data-frame-analytics-2, ml-explain-data-frame-analytics-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_explain_data_frame_analytics1_request,
  ml_explain_data_frame_analytics1_response,
  ml_explain_data_frame_analytics2_request,
  ml_explain_data_frame_analytics2_response,
  ml_explain_data_frame_analytics3_request,
  ml_explain_data_frame_analytics3_response,
  ml_explain_data_frame_analytics_request,
  ml_explain_data_frame_analytics_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_EXPLAIN_DATA_FRAME_ANALYTICS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.explain_data_frame_analytics',
  connectorGroup: 'internal',
  summary: `Explain data frame analytics config`,
  description: `Explain data frame analytics config.

This API provides explanations for a data frame analytics config that either
exists already or one that has not been created yet. The following
explanations are provided:
* which fields are included or not in the analysis and why,
* how much memory is estimated to be required. The estimate can be used when deciding the appropriate value for model_memory_limit setting later on.
If you have object fields or fields that are excluded via source filtering, they are not included in the explanation.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-explain-data-frame-analytics`,
  methods: ['GET', 'POST'],
  patterns: ['_ml/data_frame/analytics/_explain', '_ml/data_frame/analytics/{id}/_explain'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-explain-data-frame-analytics',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [
      'source',
      'dest',
      'analysis',
      'description',
      'model_memory_limit',
      'max_num_threads',
      'analyzed_fields',
      'allow_lazy_start',
    ],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(ml_explain_data_frame_analytics_request, 'body'),
      ...getShapeAt(ml_explain_data_frame_analytics_request, 'path'),
      ...getShapeAt(ml_explain_data_frame_analytics_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ml_explain_data_frame_analytics1_request, 'body'),
      ...getShapeAt(ml_explain_data_frame_analytics1_request, 'path'),
      ...getShapeAt(ml_explain_data_frame_analytics1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ml_explain_data_frame_analytics2_request, 'body'),
      ...getShapeAt(ml_explain_data_frame_analytics2_request, 'path'),
      ...getShapeAt(ml_explain_data_frame_analytics2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ml_explain_data_frame_analytics3_request, 'body'),
      ...getShapeAt(ml_explain_data_frame_analytics3_request, 'path'),
      ...getShapeAt(ml_explain_data_frame_analytics3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    ml_explain_data_frame_analytics_response,
    ml_explain_data_frame_analytics1_response,
    ml_explain_data_frame_analytics2_response,
    ml_explain_data_frame_analytics3_response,
  ]),
};
