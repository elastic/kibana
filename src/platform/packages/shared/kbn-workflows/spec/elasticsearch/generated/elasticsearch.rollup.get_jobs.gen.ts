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
 * Source: elasticsearch-specification repository, operations: rollup-get-jobs, rollup-get-jobs-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  rollup_get_jobs1_request,
  rollup_get_jobs1_response,
  rollup_get_jobs_request,
  rollup_get_jobs_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ROLLUP_GET_JOBS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.rollup.get_jobs',
  summary: `Get rollup job information`,
  description: `Get rollup job information.

Get the configuration, stats, and status of rollup jobs.

NOTE: This API returns only active (both \`STARTED\` and \`STOPPED\`) jobs.
If a job was created, ran for a while, then was deleted, the API does not return any details about it.
For details about a historical rollup job, the rollup capabilities API may be more useful.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rollup-get-jobs`,
  methods: ['GET'],
  patterns: ['_rollup/job/{id}', '_rollup/job'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rollup-get-jobs',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(rollup_get_jobs_request, 'body'),
      ...getShapeAt(rollup_get_jobs_request, 'path'),
      ...getShapeAt(rollup_get_jobs_request, 'query'),
    }),
    z.object({
      ...getShapeAt(rollup_get_jobs1_request, 'body'),
      ...getShapeAt(rollup_get_jobs1_request, 'path'),
      ...getShapeAt(rollup_get_jobs1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([rollup_get_jobs_response, rollup_get_jobs1_response]),
};
