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
 * This file contains Elasticsearch connector definitions generated from elasticsearch-specification repository.
 * Generated at: 2025-11-19T15:59:47.362Z
 * Source: elasticsearch-specification repository (582 APIs)
 *
 * To regenerate: node scripts/generate_workflows_contracts.js
 */

import { z } from '@kbn/zod/v4';
import { search_request, search_response } from './schemas/zod.gen';
import type { InternalConnectorContract } from '../../types/latest';

const SEARCH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.search',
  description: `Run a search.

Get search hits that match the query defined in the request.
You can provide search queries using the \`q\` query string parameter or the request body.
If both are specified, only the query parameter is used.

If the Elasticsearch security features are enabled, you must have the read index privilege for the target data stream, index, or alias. For cross-cluster search, refer to the documentation about configuring CCS privileges.
To search a point in time (PIT) for an alias, you must have the \`read\` index privilege for the alias's data streams or indices.

**Search slicing**

When paging through a large number of documents, it can be helpful to split the search into multiple slices to consume them independently with the \`slice\` and \`pit\` properties.
By default the splitting is done first on the shards, then locally on each shard.
The local splitting partitions the shard into contiguous ranges based on Lucene document IDs.

For instance if the number of shards is equal to 2 and you request 4 slices, the slices 0 and 2 are assigned to the first shard and the slices 1 and 3 are assigned to the second shard.

IMPORTANT: The same point-in-time ID should be used for all slices.
If different PIT IDs are used, slices can overlap and miss documents.
This situation can occur because the splitting criterion is based on Lucene document IDs, which are not stable across changes to the index.`,
  methods: ['GET', 'POST', 'GET', 'POST'],
  patterns: ['/_search', '/{index}/_search'],
  isInternal: true,
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search',
  parameterTypes: {
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...(search_request.shape.body?.unwrap()?.shape ?? {}),
    ...(search_request.shape.path?.unwrap()?.shape ?? {}),
    ...(search_request.shape.query?.unwrap()?.shape ?? {}),
  }),
  outputSchema: z.object({
    output: search_response,
    error: z.any().optional(),
  }),
};
export const GENERATED_ELASTICSEARCH_CONNECTORS: InternalConnectorContract[] = [SEARCH_CONTRACT];
