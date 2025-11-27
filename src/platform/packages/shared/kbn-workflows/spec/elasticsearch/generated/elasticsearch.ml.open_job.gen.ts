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
 * Generated at: 2025-11-27T07:43:24.900Z
 * Source: elasticsearch-specification repository, operations: ml-open-job
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ml_open_job_request, ml_open_job_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_OPEN_JOB_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.open_job',
  connectorGroup: 'internal',
  summary: `Open anomaly detection jobs`,
  description: `Open anomaly detection jobs.

An anomaly detection job must be opened to be ready to receive and analyze
data. It can be opened and closed multiple times throughout its lifecycle.
When you open a new job, it starts with an empty model.
When you open an existing job, the most recent model state is automatically
loaded. The job is ready to resume its analysis from where it left off, once
new data is received.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-open-job`,
  methods: ['POST'],
  patterns: ['_ml/anomaly_detectors/{job_id}/_open'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-open-job',
  parameterTypes: {
    headerParams: [],
    pathParams: ['job_id'],
    urlParams: ['timeout'],
    bodyParams: ['timeout'],
  },
  paramsSchema: z.object({
    ...getShapeAt(ml_open_job_request, 'body'),
    ...getShapeAt(ml_open_job_request, 'path'),
    ...getShapeAt(ml_open_job_request, 'query'),
  }),
  outputSchema: ml_open_job_response,
};
