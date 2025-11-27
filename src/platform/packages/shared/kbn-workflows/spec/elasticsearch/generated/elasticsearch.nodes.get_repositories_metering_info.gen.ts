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
 * Source: elasticsearch-specification repository, operations: nodes-get-repositories-metering-info
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  nodes_get_repositories_metering_info_request,
  nodes_get_repositories_metering_info_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const NODES_GET_REPOSITORIES_METERING_INFO_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.nodes.get_repositories_metering_info',
  connectorGroup: 'internal',
  summary: `Get cluster repositories metering`,
  description: `Get cluster repositories metering.

Get repositories metering information for a cluster.
This API exposes monotonically non-decreasing counters and it is expected that clients would durably store the information needed to compute aggregations over a period of time.
Additionally, the information exposed by this API is volatile, meaning that it will not be present after node restarts.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-get-repositories-metering-info`,
  methods: ['GET'],
  patterns: ['_nodes/{node_id}/_repositories_metering'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-get-repositories-metering-info',
  parameterTypes: {
    headerParams: [],
    pathParams: ['node_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(nodes_get_repositories_metering_info_request, 'body'),
    ...getShapeAt(nodes_get_repositories_metering_info_request, 'path'),
    ...getShapeAt(nodes_get_repositories_metering_info_request, 'query'),
  }),
  outputSchema: nodes_get_repositories_metering_info_response,
};
