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
 * Generated at: 2025-11-27T07:43:24.855Z
 * Source: elasticsearch-specification repository, operations: cat-ml-data-frame-analytics, cat-ml-data-frame-analytics-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  cat_ml_data_frame_analytics1_request,
  cat_ml_data_frame_analytics1_response,
  cat_ml_data_frame_analytics_request,
  cat_ml_data_frame_analytics_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CAT_ML_DATA_FRAME_ANALYTICS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.ml_data_frame_analytics',
  connectorGroup: 'internal',
  summary: `Get data frame analytics jobs`,
  description: `Get data frame analytics jobs.

Get configuration and usage information about data frame analytics jobs.

IMPORTANT: CAT APIs are only intended for human consumption using the Kibana
console or command line. They are not intended for use by applications. For
application consumption, use the get data frame analytics jobs statistics API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-ml-data-frame-analytics`,
  methods: ['GET'],
  patterns: ['_cat/ml/data_frame/analytics', '_cat/ml/data_frame/analytics/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-ml-data-frame-analytics',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: ['allow_no_match', 'h', 's'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(cat_ml_data_frame_analytics_request, 'body'),
      ...getShapeAt(cat_ml_data_frame_analytics_request, 'path'),
      ...getShapeAt(cat_ml_data_frame_analytics_request, 'query'),
    }),
    z.object({
      ...getShapeAt(cat_ml_data_frame_analytics1_request, 'body'),
      ...getShapeAt(cat_ml_data_frame_analytics1_request, 'path'),
      ...getShapeAt(cat_ml_data_frame_analytics1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    cat_ml_data_frame_analytics_response,
    cat_ml_data_frame_analytics1_response,
  ]),
};
