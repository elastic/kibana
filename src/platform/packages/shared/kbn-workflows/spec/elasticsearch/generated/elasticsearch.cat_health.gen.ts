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
 * Source: elasticsearch-specification repository, operations: cat-health
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { cat_health_request, cat_health_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CAT_HEALTH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.health',
  summary: `Get the cluster health status`,
  description: `Get the cluster health status.

IMPORTANT: CAT APIs are only intended for human consumption using the command line or Kibana console.
They are not intended for use by applications. For application consumption, use the cluster health API.
This API is often used to check malfunctioning clusters.
To help you track cluster health alongside log files and alerting systems, the API returns timestamps in two formats:
\`HH:MM:SS\`, which is human-readable but includes no date information;
\`Unix epoch time\`, which is machine-sortable and includes date information.
The latter format is useful for cluster recoveries that take multiple days.
You can use the cat health API to verify cluster health across multiple nodes.
You also can use the API to track the recovery of a large cluster over a longer period of time.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-health`,
  methods: ['GET'],
  patterns: ['_cat/health'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-health',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['ts', 'h', 's'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(cat_health_request, 'body'),
    ...getShapeAt(cat_health_request, 'path'),
    ...getShapeAt(cat_health_request, 'query'),
  }),
  outputSchema: cat_health_response,
};
