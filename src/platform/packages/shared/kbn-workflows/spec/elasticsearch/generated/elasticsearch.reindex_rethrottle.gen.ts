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
 * Generated at: 2025-11-27T07:04:28.244Z
 * Source: elasticsearch-specification repository, operations: reindex-rethrottle
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { reindex_rethrottle_request, reindex_rethrottle_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const REINDEX_RETHROTTLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.reindex_rethrottle',
  connectorGroup: 'internal',
  summary: `Throttle a reindex operation`,
  description: `Throttle a reindex operation.

Change the number of requests per second for a particular reindex operation.
For example:

\`\`\`
POST _reindex/r1A2WoRbTwKZ516z6NEs5A:36619/_rethrottle?requests_per_second=-1
\`\`\`

Rethrottling that speeds up the query takes effect immediately.
Rethrottling that slows down the query will take effect after completing the current batch.
This behavior prevents scroll timeouts.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-reindex`,
  methods: ['POST'],
  patterns: ['_reindex/{task_id}/_rethrottle'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-reindex',
  parameterTypes: {
    headerParams: [],
    pathParams: ['task_id'],
    urlParams: ['requests_per_second'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(reindex_rethrottle_request, 'body'),
    ...getShapeAt(reindex_rethrottle_request, 'path'),
    ...getShapeAt(reindex_rethrottle_request, 'query'),
  }),
  outputSchema: reindex_rethrottle_response,
};
