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
 * Source: elasticsearch-specification repository, operations:
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SHUTDOWN_GET_NODE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.shutdown.get_node',
  summary: null,
  description: `Get the shutdown status.

Get information about nodes that are ready to be shut down, have shut down preparations still in progress, or have stalled.
The API returns status information for each part of the shut down process.

NOTE: This feature is designed for indirect use by Elasticsearch Service, Elastic Cloud Enterprise, and Elastic Cloud on Kubernetes. Direct use is not supported.

If the operator privileges feature is enabled, you must be an operator to use this API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-shutdown-get-node`,
  methods: ['GET'],
  patterns: ['_nodes/shutdown', '_nodes/{node_id}/shutdown'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-shutdown-get-node',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.optional(z.object({})),
  outputSchema: z.optional(z.looseObject({})),
};
