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
 * Generated at: 2025-11-27T07:43:24.856Z
 * Source: elasticsearch-specification repository, operations: cat-nodes
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { cat_nodes_request, cat_nodes_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CAT_NODES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.nodes',
  connectorGroup: 'internal',
  summary: `Get node information`,
  description: `Get node information.

Get information about the nodes in a cluster.
IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the nodes info API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-nodes`,
  methods: ['GET'],
  patterns: ['_cat/nodes'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-nodes',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['full_id', 'include_unloaded_segments', 'h', 's', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(cat_nodes_request, 'body'),
    ...getShapeAt(cat_nodes_request, 'path'),
    ...getShapeAt(cat_nodes_request, 'query'),
  }),
  outputSchema: cat_nodes_response,
};
