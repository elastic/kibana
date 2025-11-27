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
 * Source: elasticsearch-specification repository, operations: ml-get-jobs, ml-get-jobs-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_get_jobs1_request,
  ml_get_jobs1_response,
  ml_get_jobs_request,
  ml_get_jobs_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_GET_JOBS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.get_jobs',
  connectorGroup: 'internal',
  summary: `Get anomaly detection jobs configuration info`,
  description: `Get anomaly detection jobs configuration info.

You can get information for multiple anomaly detection jobs in a single API
request by using a group name, a comma-separated list of jobs, or a wildcard
expression. You can get information for all anomaly detection jobs by using
\`_all\`, by specifying \`*\` as the \`<job_id>\`, or by omitting the \`<job_id>\`.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-jobs`,
  methods: ['GET'],
  patterns: ['_ml/anomaly_detectors/{job_id}', '_ml/anomaly_detectors'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-get-jobs',
  parameterTypes: {
    headerParams: [],
    pathParams: ['job_id'],
    urlParams: ['allow_no_match', 'exclude_generated'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(ml_get_jobs_request, 'body'),
      ...getShapeAt(ml_get_jobs_request, 'path'),
      ...getShapeAt(ml_get_jobs_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ml_get_jobs1_request, 'body'),
      ...getShapeAt(ml_get_jobs1_request, 'path'),
      ...getShapeAt(ml_get_jobs1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([ml_get_jobs_response, ml_get_jobs1_response]),
};
