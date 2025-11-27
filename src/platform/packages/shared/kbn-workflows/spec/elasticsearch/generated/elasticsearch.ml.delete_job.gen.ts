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
 * Generated at: 2025-11-27T07:43:24.895Z
 * Source: elasticsearch-specification repository, operations: ml-delete-job
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ml_delete_job_request, ml_delete_job_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_DELETE_JOB_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.delete_job',
  connectorGroup: 'internal',
  summary: `Delete an anomaly detection job`,
  description: `Delete an anomaly detection job.

All job configuration, model state and results are deleted.
It is not currently possible to delete multiple jobs using wildcards or a
comma separated list. If you delete a job that has a datafeed, the request
first tries to delete the datafeed. This behavior is equivalent to calling
the delete datafeed API with the same timeout and force parameters as the
delete job request.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-job`,
  methods: ['DELETE'],
  patterns: ['_ml/anomaly_detectors/{job_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-job',
  parameterTypes: {
    headerParams: [],
    pathParams: ['job_id'],
    urlParams: ['force', 'delete_user_annotations', 'wait_for_completion'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_delete_job_request, 'body'),
    ...getShapeAt(ml_delete_job_request, 'path'),
    ...getShapeAt(ml_delete_job_request, 'query'),
  }),
  outputSchema: ml_delete_job_response,
};
