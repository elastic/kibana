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
 * Generated at: 2025-11-27T07:43:24.897Z
 * Source: elasticsearch-specification repository, operations: ml-get-data-frame-analytics, ml-get-data-frame-analytics-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_get_data_frame_analytics1_request,
  ml_get_data_frame_analytics1_response,
  ml_get_data_frame_analytics_request,
  ml_get_data_frame_analytics_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_GET_DATA_FRAME_ANALYTICS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_data_frame_analytics',
  connectorGroup: 'internal',
  summary: `Get data frame analytics job configuration info`,
  description: `Get data frame analytics job configuration info.

You can get information for multiple data frame analytics jobs in a single
API request by using a comma-separated list of data frame analytics jobs or a
wildcard expression.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-data-frame-analytics`,
  methods: ['GET'],
  patterns: ['_ml/data_frame/analytics/{id}', '_ml/data_frame/analytics'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-data-frame-analytics',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: ['allow_no_match', 'from', 'size', 'exclude_generated'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(ml_get_data_frame_analytics_request, 'body'),
      ...getShapeAt(ml_get_data_frame_analytics_request, 'path'),
      ...getShapeAt(ml_get_data_frame_analytics_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ml_get_data_frame_analytics1_request, 'body'),
      ...getShapeAt(ml_get_data_frame_analytics1_request, 'path'),
      ...getShapeAt(ml_get_data_frame_analytics1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    ml_get_data_frame_analytics_response,
    ml_get_data_frame_analytics1_response,
  ]),
};
