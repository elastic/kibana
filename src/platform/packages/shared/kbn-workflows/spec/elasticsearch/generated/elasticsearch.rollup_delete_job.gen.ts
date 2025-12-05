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
 * Source: elasticsearch-specification repository, operations: rollup-delete-job
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  rollup_delete_job_request,
  rollup_delete_job_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ROLLUP_DELETE_JOB_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.rollup.delete_job',
  summary: `Delete a rollup job`,
  description: `Delete a rollup job.

A job must be stopped before it can be deleted.
If you attempt to delete a started job, an error occurs.
Similarly, if you attempt to delete a nonexistent job, an exception occurs.

IMPORTANT: When you delete a job, you remove only the process that is actively monitoring and rolling up data.
The API does not delete any previously rolled up data.
This is by design; a user may wish to roll up a static data set.
Because the data set is static, after it has been fully rolled up there is no need to keep the indexing rollup job around (as there will be no new data).
Thus the job can be deleted, leaving behind the rolled up data for analysis.
If you wish to also remove the rollup data and the rollup index contains the data for only a single job, you can delete the whole rollup index.
If the rollup index stores data from several jobs, you must issue a delete-by-query that targets the rollup job's identifier in the rollup index. For example:

\`\`\`
POST my_rollup_index/_delete_by_query
{
  "query": {
    "term": {
      "_rollup.id": "the_rollup_job_id"
    }
  }
}
\`\`\`

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rollup-delete-job`,
  methods: ['DELETE'],
  patterns: ['_rollup/job/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rollup-delete-job',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(rollup_delete_job_request, 'body'),
    ...getShapeAt(rollup_delete_job_request, 'path'),
    ...getShapeAt(rollup_delete_job_request, 'query'),
  }),
  outputSchema: rollup_delete_job_response,
};
