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
 * Generated at: 2025-11-27T07:04:28.241Z
 * Source: elasticsearch-specification repository, operations: nodes-usage, nodes-usage-1, nodes-usage-2, nodes-usage-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  nodes_usage1_request,
  nodes_usage1_response,
  nodes_usage2_request,
  nodes_usage2_response,
  nodes_usage3_request,
  nodes_usage3_response,
  nodes_usage_request,
  nodes_usage_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const NODES_USAGE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.nodes.usage',
  connectorGroup: 'internal',
  summary: `Get feature usage information`,
  description: `Get feature usage information.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-usage`,
  methods: ['GET'],
  patterns: [
    '_nodes/usage',
    '_nodes/{node_id}/usage',
    '_nodes/usage/{metric}',
    '_nodes/{node_id}/usage/{metric}',
  ],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-usage',
  parameterTypes: {
    headerParams: [],
    pathParams: ['node_id', 'metric'],
    urlParams: ['timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(nodes_usage_request, 'body'),
      ...getShapeAt(nodes_usage_request, 'path'),
      ...getShapeAt(nodes_usage_request, 'query'),
    }),
    z.object({
      ...getShapeAt(nodes_usage1_request, 'body'),
      ...getShapeAt(nodes_usage1_request, 'path'),
      ...getShapeAt(nodes_usage1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(nodes_usage2_request, 'body'),
      ...getShapeAt(nodes_usage2_request, 'path'),
      ...getShapeAt(nodes_usage2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(nodes_usage3_request, 'body'),
      ...getShapeAt(nodes_usage3_request, 'path'),
      ...getShapeAt(nodes_usage3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    nodes_usage_response,
    nodes_usage1_response,
    nodes_usage2_response,
    nodes_usage3_response,
  ]),
};
