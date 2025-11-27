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
 * Generated at: 2025-11-27T07:04:28.219Z
 * Source: elasticsearch-specification repository, operations: indices-flush, indices-flush-1, indices-flush-2, indices-flush-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_flush1_request,
  indices_flush1_response,
  indices_flush2_request,
  indices_flush2_response,
  indices_flush3_request,
  indices_flush3_response,
  indices_flush_request,
  indices_flush_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_FLUSH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.flush',
  connectorGroup: 'internal',
  summary: `Flush data streams or indices`,
  description: `Flush data streams or indices.

Flushing a data stream or index is the process of making sure that any data that is currently only stored in the transaction log is also permanently stored in the Lucene index.
When restarting, Elasticsearch replays any unflushed operations from the transaction log into the Lucene index to bring it back into the state that it was in before the restart.
Elasticsearch automatically triggers flushes as needed, using heuristics that trade off the size of the unflushed transaction log against the cost of performing each flush.

After each operation has been flushed it is permanently stored in the Lucene index.
This may mean that there is no need to maintain an additional copy of it in the transaction log.
The transaction log is made up of multiple files, called generations, and Elasticsearch will delete any generation files when they are no longer needed, freeing up disk space.

It is also possible to trigger a flush on one or more indices using the flush API, although it is rare for users to need to call this API directly.
If you call the flush API after indexing some documents then a successful response indicates that Elasticsearch has flushed all the documents that were indexed before the flush API was called.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-flush`,
  methods: ['POST', 'GET'],
  patterns: ['_flush', '{index}/_flush'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-flush',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [
      'allow_no_indices',
      'expand_wildcards',
      'force',
      'ignore_unavailable',
      'wait_if_ongoing',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(indices_flush_request, 'body'),
      ...getShapeAt(indices_flush_request, 'path'),
      ...getShapeAt(indices_flush_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_flush1_request, 'body'),
      ...getShapeAt(indices_flush1_request, 'path'),
      ...getShapeAt(indices_flush1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_flush2_request, 'body'),
      ...getShapeAt(indices_flush2_request, 'path'),
      ...getShapeAt(indices_flush2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_flush3_request, 'body'),
      ...getShapeAt(indices_flush3_request, 'path'),
      ...getShapeAt(indices_flush3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    indices_flush_response,
    indices_flush1_response,
    indices_flush2_response,
    indices_flush3_response,
  ]),
};
