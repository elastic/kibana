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
 * Generated at: 2025-11-27T07:04:28.238Z
 * Source: elasticsearch-specification repository, operations: ml-reset-job
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ml_reset_job_request, ml_reset_job_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_RESET_JOB_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.reset_job',
  connectorGroup: 'internal',
  summary: `Reset an anomaly detection job`,
  description: `Reset an anomaly detection job.

All model state and results are deleted. The job is ready to start over as if
it had just been created.
It is not currently possible to reset multiple jobs using wildcards or a
comma separated list.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-reset-job`,
  methods: ['POST'],
  patterns: ['_ml/anomaly_detectors/{job_id}/_reset'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-reset-job',
  parameterTypes: {
    headerParams: [],
    pathParams: ['job_id'],
    urlParams: ['wait_for_completion', 'delete_user_annotations'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_reset_job_request, 'body'),
    ...getShapeAt(ml_reset_job_request, 'path'),
    ...getShapeAt(ml_reset_job_request, 'query'),
  }),
  outputSchema: ml_reset_job_response,
};
