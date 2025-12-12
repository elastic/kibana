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
 * Source: elasticsearch-specification repository, operations: rollup-put-job
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { rollup_put_job_request, rollup_put_job_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ROLLUP_PUT_JOB_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.rollup.put_job',
  summary: `Create a rollup job`,
  description: `Create a rollup job.

WARNING: From 8.15.0, calling this API in a cluster with no rollup usage will fail with a message about the deprecation and planned removal of rollup features. A cluster needs to contain either a rollup job or a rollup index in order for this API to be allowed to run.

The rollup job configuration contains all the details about how the job should run, when it indexes documents, and what future queries will be able to run against the rollup index.

There are three main sections to the job configuration: the logistical details about the job (for example, the cron schedule), the fields that are used for grouping, and what metrics to collect for each group.

Jobs are created in a \`STOPPED\` state. You can start them with the start rollup jobs API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rollup-put-job`,
  methods: ['PUT'],
  patterns: ['_rollup/job/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rollup-put-job',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [
      'cron',
      'groups',
      'index_pattern',
      'metrics',
      'page_size',
      'rollup_index',
      'timeout',
      'headers',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(rollup_put_job_request, 'body'),
    ...getShapeAt(rollup_put_job_request, 'path'),
    ...getShapeAt(rollup_put_job_request, 'query'),
  }),
  outputSchema: rollup_put_job_response,
};
