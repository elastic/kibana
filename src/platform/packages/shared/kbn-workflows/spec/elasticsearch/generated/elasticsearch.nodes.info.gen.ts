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
 * Generated at: 2025-11-27T07:43:24.904Z
 * Source: elasticsearch-specification repository, operations: nodes-info, nodes-info-1, nodes-info-2, nodes-info-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  nodes_info1_request,
  nodes_info1_response,
  nodes_info2_request,
  nodes_info2_response,
  nodes_info3_request,
  nodes_info3_response,
  nodes_info_request,
  nodes_info_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const NODES_INFO_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.nodes.info',
  connectorGroup: 'internal',
  summary: `Get node information`,
  description: `Get node information.

By default, the API returns all attributes and core settings for cluster nodes.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-info`,
  methods: ['GET'],
  patterns: ['_nodes', '_nodes/{node_id}', '_nodes/{metric}', '_nodes/{node_id}/{metric}'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-info',
  parameterTypes: {
    headerParams: [],
    pathParams: ['node_id', 'metric'],
    urlParams: ['flat_settings', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(nodes_info_request, 'body'),
      ...getShapeAt(nodes_info_request, 'path'),
      ...getShapeAt(nodes_info_request, 'query'),
    }),
    z.object({
      ...getShapeAt(nodes_info1_request, 'body'),
      ...getShapeAt(nodes_info1_request, 'path'),
      ...getShapeAt(nodes_info1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(nodes_info2_request, 'body'),
      ...getShapeAt(nodes_info2_request, 'path'),
      ...getShapeAt(nodes_info2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(nodes_info3_request, 'body'),
      ...getShapeAt(nodes_info3_request, 'path'),
      ...getShapeAt(nodes_info3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    nodes_info_response,
    nodes_info1_response,
    nodes_info2_response,
    nodes_info3_response,
  ]),
};
