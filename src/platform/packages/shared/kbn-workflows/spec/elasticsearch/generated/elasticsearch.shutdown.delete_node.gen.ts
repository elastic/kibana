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
 * Generated at: 2025-11-27T07:04:28.254Z
 * Source: elasticsearch-specification repository, operations:
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import type { InternalConnectorContract } from '../../../types/latest';

// import all needed request and response schemas generated from the OpenAPI spec
import {} from './es_openapi_zod.gen';

// export contract
export const SHUTDOWN_DELETE_NODE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.shutdown.delete_node',
  connectorGroup: 'internal',
  summary: null,
  description: `Cancel node shutdown preparations.

Remove a node from the shutdown list so it can resume normal operations.
You must explicitly clear the shutdown request when a node rejoins the cluster or when a node has permanently left the cluster.
Shutdown requests are never removed automatically by Elasticsearch.

NOTE: This feature is designed for indirect use by Elastic Cloud, Elastic Cloud Enterprise, and Elastic Cloud on Kubernetes.
Direct use is not supported.

If the operator privileges feature is enabled, you must be an operator to use this API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-shutdown-delete-node`,
  methods: ['DELETE'],
  patterns: ['_nodes/{node_id}/shutdown'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-shutdown-delete-node',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.object({})),
  outputSchema: z.optional(z.looseObject({})),
};
