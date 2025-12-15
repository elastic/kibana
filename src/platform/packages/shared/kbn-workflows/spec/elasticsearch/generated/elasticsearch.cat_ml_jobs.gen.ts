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
 * Source: elasticsearch-specification repository, operations: cat-ml-jobs, cat-ml-jobs-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  cat_ml_jobs1_request,
  cat_ml_jobs1_response,
  cat_ml_jobs_request,
  cat_ml_jobs_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CAT_ML_JOBS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.ml_jobs',
  summary: `Get anomaly detection jobs`,
  description: `Get anomaly detection jobs.

Get configuration and usage information for anomaly detection jobs.
This API returns a maximum of 10,000 jobs.
If the Elasticsearch security features are enabled, you must have \`monitor_ml\`,
\`monitor\`, \`manage_ml\`, or \`manage\` cluster privileges to use this API.

IMPORTANT: CAT APIs are only intended for human consumption using the Kibana
console or command line. They are not intended for use by applications. For
application consumption, use the get anomaly detection job statistics API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-ml-jobs`,
  methods: ['GET'],
  patterns: ['_cat/ml/anomaly_detectors', '_cat/ml/anomaly_detectors/{job_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-ml-jobs',
  parameterTypes: {
    headerParams: [],
    pathParams: ['job_id'],
    urlParams: ['allow_no_match', 'h', 's'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(cat_ml_jobs_request, 'body'),
      ...getShapeAt(cat_ml_jobs_request, 'path'),
      ...getShapeAt(cat_ml_jobs_request, 'query'),
    }),
    z.object({
      ...getShapeAt(cat_ml_jobs1_request, 'body'),
      ...getShapeAt(cat_ml_jobs1_request, 'path'),
      ...getShapeAt(cat_ml_jobs1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([cat_ml_jobs_response, cat_ml_jobs1_response]),
};
