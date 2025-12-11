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
 * Source: elasticsearch-specification repository, operations: ml-get-data-frame-analytics-stats, ml-get-data-frame-analytics-stats-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_get_data_frame_analytics_stats1_request,
  ml_get_data_frame_analytics_stats1_response,
  ml_get_data_frame_analytics_stats_request,
  ml_get_data_frame_analytics_stats_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_GET_DATA_FRAME_ANALYTICS_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_data_frame_analytics_stats',
  summary: `Get data frame analytics job stats`,
  description: `Get data frame analytics job stats.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-data-frame-analytics-stats`,
  methods: ['GET'],
  patterns: ['_ml/data_frame/analytics/_stats', '_ml/data_frame/analytics/{id}/_stats'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-data-frame-analytics-stats',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: ['allow_no_match', 'from', 'size', 'verbose'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(ml_get_data_frame_analytics_stats_request, 'body'),
      ...getShapeAt(ml_get_data_frame_analytics_stats_request, 'path'),
      ...getShapeAt(ml_get_data_frame_analytics_stats_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ml_get_data_frame_analytics_stats1_request, 'body'),
      ...getShapeAt(ml_get_data_frame_analytics_stats1_request, 'path'),
      ...getShapeAt(ml_get_data_frame_analytics_stats1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    ml_get_data_frame_analytics_stats_response,
    ml_get_data_frame_analytics_stats1_response,
  ]),
};
