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
 * Source: elasticsearch-specification repository, operations: transform-get-node-stats
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  transform_get_node_stats_request,
  transform_get_node_stats_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const TRANSFORM_GET_NODE_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.transform.get_node_stats',
  summary: `Get node stats`,
  description: `Get node stats.

Get per-node information about transform usage.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-get-node-stats`,
  methods: ['GET'],
  patterns: ['_transform/_node_stats'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-get-node-stats',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(transform_get_node_stats_request, 'body'),
    ...getShapeAt(transform_get_node_stats_request, 'path'),
    ...getShapeAt(transform_get_node_stats_request, 'query'),
  }),
  outputSchema: transform_get_node_stats_response,
};
