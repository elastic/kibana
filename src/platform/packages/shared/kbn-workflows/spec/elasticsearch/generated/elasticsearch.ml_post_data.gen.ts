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
 * Source: elasticsearch-specification repository, operations: ml-post-data
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ml_post_data_request, ml_post_data_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_POST_DATA_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.post_data',
  summary: `Send data to an anomaly detection job for analysis`,
  description: `Send data to an anomaly detection job for analysis.

IMPORTANT: For each job, data can be accepted from only a single connection at a time.
It is not currently possible to post data to multiple jobs using wildcards or a comma-separated list.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-post-data`,
  methods: ['POST'],
  patterns: ['_ml/anomaly_detectors/{job_id}/_data'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-post-data',
  parameterTypes: {
    headerParams: [],
    pathParams: ['job_id'],
    urlParams: ['reset_end', 'reset_start'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_post_data_request, 'body'),
    ...getShapeAt(ml_post_data_request, 'path'),
    ...getShapeAt(ml_post_data_request, 'query'),
  }),
  outputSchema: ml_post_data_response,
};
