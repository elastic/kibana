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
 * Generated at: 2025-11-27T07:04:28.235Z
 * Source: elasticsearch-specification repository, operations: ml-get-job-stats, ml-get-job-stats-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_get_job_stats1_request,
  ml_get_job_stats1_response,
  ml_get_job_stats_request,
  ml_get_job_stats_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_GET_JOB_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_job_stats',
  connectorGroup: 'internal',
  summary: `Get anomaly detection job stats`,
  description: `Get anomaly detection job stats.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-job-stats`,
  methods: ['GET'],
  patterns: ['_ml/anomaly_detectors/_stats', '_ml/anomaly_detectors/{job_id}/_stats'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-job-stats',
  parameterTypes: {
    headerParams: [],
    pathParams: ['job_id'],
    urlParams: ['allow_no_match'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(ml_get_job_stats_request, 'body'),
      ...getShapeAt(ml_get_job_stats_request, 'path'),
      ...getShapeAt(ml_get_job_stats_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ml_get_job_stats1_request, 'body'),
      ...getShapeAt(ml_get_job_stats1_request, 'path'),
      ...getShapeAt(ml_get_job_stats1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([ml_get_job_stats_response, ml_get_job_stats1_response]),
};
