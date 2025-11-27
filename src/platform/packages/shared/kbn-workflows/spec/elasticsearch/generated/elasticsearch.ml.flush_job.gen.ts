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
 * Generated at: 2025-11-27T07:43:24.896Z
 * Source: elasticsearch-specification repository, operations: ml-flush-job
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ml_flush_job_request, ml_flush_job_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_FLUSH_JOB_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.flush_job',
  connectorGroup: 'internal',
  summary: `Force buffered data to be processed`,
  description: `Force buffered data to be processed.

The flush jobs API is only applicable when sending data for analysis using
the post data API. Depending on the content of the buffer, then it might
additionally calculate new results. Both flush and close operations are
similar, however the flush is more efficient if you are expecting to send
more data for analysis. When flushing, the job remains open and is available
to continue analyzing data. A close operation additionally prunes and
persists the model state to disk and the job must be opened again before
analyzing further data.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-flush-job`,
  methods: ['POST'],
  patterns: ['_ml/anomaly_detectors/{job_id}/_flush'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-flush-job',
  parameterTypes: {
    headerParams: [],
    pathParams: ['job_id'],
    urlParams: ['advance_time', 'calc_interim', 'end', 'skip_time', 'start'],
    bodyParams: ['advance_time', 'calc_interim', 'end', 'skip_time', 'start'],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_flush_job_request, 'body'),
    ...getShapeAt(ml_flush_job_request, 'path'),
    ...getShapeAt(ml_flush_job_request, 'query'),
  }),
  outputSchema: ml_flush_job_response,
};
