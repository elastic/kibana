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
 * Source: elasticsearch-specification repository, operations: ml-preview-data-frame-analytics, ml-preview-data-frame-analytics-1, ml-preview-data-frame-analytics-2, ml-preview-data-frame-analytics-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_preview_data_frame_analytics1_request,
  ml_preview_data_frame_analytics1_response,
  ml_preview_data_frame_analytics2_request,
  ml_preview_data_frame_analytics2_response,
  ml_preview_data_frame_analytics3_request,
  ml_preview_data_frame_analytics3_response,
  ml_preview_data_frame_analytics_request,
  ml_preview_data_frame_analytics_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_PREVIEW_DATA_FRAME_ANALYTICS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.preview_data_frame_analytics',
  connectorGroup: 'internal',
  summary: `Preview features used by data frame analytics`,
  description: `Preview features used by data frame analytics.

Preview the extracted features used by a data frame analytics config.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-preview-data-frame-analytics`,
  methods: ['GET', 'POST'],
  patterns: ['_ml/data_frame/analytics/_preview', '_ml/data_frame/analytics/{id}/_preview'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-preview-data-frame-analytics',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['config'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(ml_preview_data_frame_analytics_request, 'body'),
      ...getShapeAt(ml_preview_data_frame_analytics_request, 'path'),
      ...getShapeAt(ml_preview_data_frame_analytics_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ml_preview_data_frame_analytics1_request, 'body'),
      ...getShapeAt(ml_preview_data_frame_analytics1_request, 'path'),
      ...getShapeAt(ml_preview_data_frame_analytics1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ml_preview_data_frame_analytics2_request, 'body'),
      ...getShapeAt(ml_preview_data_frame_analytics2_request, 'path'),
      ...getShapeAt(ml_preview_data_frame_analytics2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ml_preview_data_frame_analytics3_request, 'body'),
      ...getShapeAt(ml_preview_data_frame_analytics3_request, 'path'),
      ...getShapeAt(ml_preview_data_frame_analytics3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    ml_preview_data_frame_analytics_response,
    ml_preview_data_frame_analytics1_response,
    ml_preview_data_frame_analytics2_response,
    ml_preview_data_frame_analytics3_response,
  ]),
};
