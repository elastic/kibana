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
 * Source: elasticsearch-specification repository, operations: delete-by-query-rethrottle
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  delete_by_query_rethrottle_request,
  delete_by_query_rethrottle_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const DELETE_BY_QUERY_RETHROTTLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.delete_by_query_rethrottle',
  summary: `Throttle a delete by query operation`,
  description: `Throttle a delete by query operation.

Change the number of requests per second for a particular delete by query operation.
Rethrottling that speeds up the query takes effect immediately but rethrotting that slows down the query takes effect after completing the current batch to prevent scroll timeouts.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-delete-by-query-rethrottle`,
  methods: ['POST'],
  patterns: ['_delete_by_query/{task_id}/_rethrottle'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-delete-by-query-rethrottle',
  parameterTypes: {
    headerParams: [],
    pathParams: ['task_id'],
    urlParams: ['requests_per_second'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(delete_by_query_rethrottle_request, 'body'),
    ...getShapeAt(delete_by_query_rethrottle_request, 'path'),
    ...getShapeAt(delete_by_query_rethrottle_request, 'query'),
  }),
  outputSchema: delete_by_query_rethrottle_response,
};
