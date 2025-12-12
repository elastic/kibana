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
 * Source: elasticsearch-specification repository, operations: rollup-stop-job
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { rollup_stop_job_request, rollup_stop_job_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ROLLUP_STOP_JOB_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.rollup.stop_job',
  summary: `Stop rollup jobs`,
  description: `Stop rollup jobs.

If you try to stop a job that does not exist, an exception occurs.
If you try to stop a job that is already stopped, nothing happens.

Since only a stopped job can be deleted, it can be useful to block the API until the indexer has fully stopped.
This is accomplished with the \`wait_for_completion\` query parameter, and optionally a timeout. For example:

\`\`\`
POST _rollup/job/sensor/_stop?wait_for_completion=true&timeout=10s
\`\`\`
The parameter blocks the API call from returning until either the job has moved to STOPPED or the specified time has elapsed.
If the specified time elapses without the job moving to STOPPED, a timeout exception occurs.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rollup-stop-job`,
  methods: ['POST'],
  patterns: ['_rollup/job/{id}/_stop'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rollup-stop-job',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: ['timeout', 'wait_for_completion'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(rollup_stop_job_request, 'body'),
    ...getShapeAt(rollup_stop_job_request, 'path'),
    ...getShapeAt(rollup_stop_job_request, 'query'),
  }),
  outputSchema: rollup_stop_job_response,
};
