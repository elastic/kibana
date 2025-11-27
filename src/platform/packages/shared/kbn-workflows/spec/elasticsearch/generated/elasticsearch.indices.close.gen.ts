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
 * Generated at: 2025-11-27T07:43:24.874Z
 * Source: elasticsearch-specification repository, operations: indices-close
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { indices_close_request, indices_close_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_CLOSE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.close',
  connectorGroup: 'internal',
  summary: `Close an index`,
  description: `Close an index.

A closed index is blocked for read or write operations and does not allow all operations that opened indices allow.
It is not possible to index documents or to search for documents in a closed index.
Closed indices do not have to maintain internal data structures for indexing or searching documents, which results in a smaller overhead on the cluster.

When opening or closing an index, the master node is responsible for restarting the index shards to reflect the new state of the index.
The shards will then go through the normal recovery process.
The data of opened and closed indices is automatically replicated by the cluster to ensure that enough shard copies are safely kept around at all times.

You can open and close multiple indices.
An error is thrown if the request explicitly refers to a missing index.
This behaviour can be turned off using the \`ignore_unavailable=true\` parameter.

By default, you must explicitly name the indices you are opening or closing.
To open or close indices with \`_all\`, \`*\`, or other wildcard expressions, change the\` action.destructive_requires_name\` setting to \`false\`. This setting can also be changed with the cluster update settings API.

Closed indices consume a significant amount of disk-space which can cause problems in managed environments.
Closing indices can be turned off with the cluster settings API by setting \`cluster.indices.close.enable\` to \`false\`.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-close`,
  methods: ['POST'],
  patterns: ['{index}/_close'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-close',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [
      'allow_no_indices',
      'expand_wildcards',
      'ignore_unavailable',
      'master_timeout',
      'timeout',
      'wait_for_active_shards',
    ],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(indices_close_request, 'body'),
    ...getShapeAt(indices_close_request, 'path'),
    ...getShapeAt(indices_close_request, 'query'),
  }),
  outputSchema: indices_close_response,
};
