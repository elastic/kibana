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
 * Generated at: 2025-11-27T07:43:24.902Z
 * Source: elasticsearch-specification repository, operations: ml-start-data-frame-analytics
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_start_data_frame_analytics_request,
  ml_start_data_frame_analytics_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_START_DATA_FRAME_ANALYTICS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.start_data_frame_analytics',
  connectorGroup: 'internal',
  summary: `Start a data frame analytics job`,
  description: `Start a data frame analytics job.

A data frame analytics job can be started and stopped multiple times
throughout its lifecycle.
If the destination index does not exist, it is created automatically the
first time you start the data frame analytics job. The
\`index.number_of_shards\` and \`index.number_of_replicas\` settings for the
destination index are copied from the source index. If there are multiple
source indices, the destination index copies the highest setting values. The
mappings for the destination index are also copied from the source indices.
If there are any mapping conflicts, the job fails to start.
If the destination index exists, it is used as is. You can therefore set up
the destination index in advance with custom settings and mappings.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-start-data-frame-analytics`,
  methods: ['POST'],
  patterns: ['_ml/data_frame/analytics/{id}/_start'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-start-data-frame-analytics',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_start_data_frame_analytics_request, 'body'),
    ...getShapeAt(ml_start_data_frame_analytics_request, 'path'),
    ...getShapeAt(ml_start_data_frame_analytics_request, 'query'),
  }),
  outputSchema: ml_start_data_frame_analytics_response,
};
