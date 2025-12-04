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
 * Source: elasticsearch-specification repository, operations: ml-update-data-frame-analytics
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_update_data_frame_analytics_request,
  ml_update_data_frame_analytics_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_UPDATE_DATA_FRAME_ANALYTICS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.update_data_frame_analytics',
  summary: `Update a data frame analytics job`,
  description: `Update a data frame analytics job.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-update-data-frame-analytics`,
  methods: ['POST'],
  patterns: ['_ml/data_frame/analytics/{id}/_update'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-update-data-frame-analytics',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['description', 'model_memory_limit', 'max_num_threads', 'allow_lazy_start'],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_update_data_frame_analytics_request, 'body'),
    ...getShapeAt(ml_update_data_frame_analytics_request, 'path'),
    ...getShapeAt(ml_update_data_frame_analytics_request, 'query'),
  }),
  outputSchema: ml_update_data_frame_analytics_response,
};
