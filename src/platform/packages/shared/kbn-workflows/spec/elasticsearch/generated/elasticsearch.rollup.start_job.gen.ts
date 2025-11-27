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
 * Generated at: 2025-11-27T07:04:28.245Z
 * Source: elasticsearch-specification repository, operations: rollup-start-job
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { rollup_start_job_request, rollup_start_job_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ROLLUP_START_JOB_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.rollup.start_job',
  connectorGroup: 'internal',
  summary: `Start rollup jobs`,
  description: `Start rollup jobs.

If you try to start a job that does not exist, an exception occurs.
If you try to start a job that is already started, nothing happens.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rollup-start-job`,
  methods: ['POST'],
  patterns: ['_rollup/job/{id}/_start'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rollup-start-job',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(rollup_start_job_request, 'body'),
    ...getShapeAt(rollup_start_job_request, 'path'),
    ...getShapeAt(rollup_start_job_request, 'query'),
  }),
  outputSchema: rollup_start_job_response,
};
