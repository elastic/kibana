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
 * Generated at: 2025-11-27T07:43:24.894Z
 * Source: elasticsearch-specification repository, operations: ml-close-job
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ml_close_job_request, ml_close_job_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_CLOSE_JOB_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.close_job',
  connectorGroup: 'internal',
  summary: `Close anomaly detection jobs`,
  description: `Close anomaly detection jobs.

A job can be opened and closed multiple times throughout its lifecycle. A closed job cannot receive data or perform analysis operations, but you can still explore and navigate results.
When you close a job, it runs housekeeping tasks such as pruning the model history, flushing buffers, calculating final results and persisting the model snapshots. Depending upon the size of the job, it could take several minutes to close and the equivalent time to re-open. After it is closed, the job has a minimal overhead on the cluster except for maintaining its meta data. Therefore it is a best practice to close jobs that are no longer required to process data.
If you close an anomaly detection job whose datafeed is running, the request first tries to stop the datafeed. This behavior is equivalent to calling stop datafeed API with the same timeout and force parameters as the close job request.
When a datafeed that has a specified end date stops, it automatically closes its associated job.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-close-job`,
  methods: ['POST'],
  patterns: ['_ml/anomaly_detectors/{job_id}/_close'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-close-job',
  parameterTypes: {
    headerParams: [],
    pathParams: ['job_id'],
    urlParams: ['allow_no_match', 'force', 'timeout'],
    bodyParams: ['allow_no_match', 'force', 'timeout'],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_close_job_request, 'body'),
    ...getShapeAt(ml_close_job_request, 'path'),
    ...getShapeAt(ml_close_job_request, 'query'),
  }),
  outputSchema: ml_close_job_response,
};
