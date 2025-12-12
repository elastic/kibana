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
 * Source: elasticsearch-specification repository, operations: ml-delete-expired-data, ml-delete-expired-data-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ml_delete_expired_data1_request,
  ml_delete_expired_data1_response,
  ml_delete_expired_data_request,
  ml_delete_expired_data_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ML_DELETE_EXPIRED_DATA_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ml.delete_expired_data',
  summary: `Delete expired ML data`,
  description: `Delete expired ML data.

Delete all job results, model snapshots and forecast data that have exceeded
their retention days period. Machine learning state documents that are not
associated with any job are also deleted.
You can limit the request to a single or set of anomaly detection jobs by
using a job identifier, a group name, a comma-separated list of jobs, or a
wildcard expression. You can delete expired data for all anomaly detection
jobs by using \`_all\`, by specifying \`*\` as the \`<job_id>\`, or by omitting the
\`<job_id>\`.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-expired-data`,
  methods: ['DELETE'],
  patterns: ['_ml/_delete_expired_data/{job_id}', '_ml/_delete_expired_data'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ml-delete-expired-data',
  parameterTypes: {
    headerParams: [],
    pathParams: ['job_id'],
    urlParams: ['requests_per_second', 'timeout'],
    bodyParams: ['requests_per_second', 'timeout'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(ml_delete_expired_data_request, 'body'),
      ...getShapeAt(ml_delete_expired_data_request, 'path'),
      ...getShapeAt(ml_delete_expired_data_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ml_delete_expired_data1_request, 'body'),
      ...getShapeAt(ml_delete_expired_data1_request, 'path'),
      ...getShapeAt(ml_delete_expired_data1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([ml_delete_expired_data_response, ml_delete_expired_data1_response]),
};
