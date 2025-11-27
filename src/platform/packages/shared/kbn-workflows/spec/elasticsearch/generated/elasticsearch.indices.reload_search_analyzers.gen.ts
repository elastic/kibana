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
 * Generated at: 2025-11-27T07:04:28.224Z
 * Source: elasticsearch-specification repository, operations: indices-reload-search-analyzers, indices-reload-search-analyzers-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_reload_search_analyzers1_request,
  indices_reload_search_analyzers1_response,
  indices_reload_search_analyzers_request,
  indices_reload_search_analyzers_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_RELOAD_SEARCH_ANALYZERS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.reload_search_analyzers',
  connectorGroup: 'internal',
  summary: `Reload search analyzers`,
  description: `Reload search analyzers.

Reload an index's search analyzers and their resources.
For data streams, the API reloads search analyzers and resources for the stream's backing indices.

IMPORTANT: After reloading the search analyzers you should clear the request cache to make sure it doesn't contain responses derived from the previous versions of the analyzer.

You can use the reload search analyzers API to pick up changes to synonym files used in the \`synonym_graph\` or \`synonym\` token filter of a search analyzer.
To be eligible, the token filter must have an \`updateable\` flag of \`true\` and only be used in search analyzers.

NOTE: This API does not perform a reload for each shard of an index.
Instead, it performs a reload for each node containing index shards.
As a result, the total shard count returned by the API can differ from the number of index shards.
Because reloading affects every node with an index shard, it is important to update the synonym file on every data node in the cluster--including nodes that don't contain a shard replica--before using this API.
This ensures the synonym file is updated everywhere in the cluster in case shards are relocated in the future.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-reload-search-analyzers`,
  methods: ['GET', 'POST'],
  patterns: ['{index}/_reload_search_analyzers'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-reload-search-analyzers',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: ['allow_no_indices', 'expand_wildcards', 'ignore_unavailable', 'resource'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(indices_reload_search_analyzers_request, 'body'),
      ...getShapeAt(indices_reload_search_analyzers_request, 'path'),
      ...getShapeAt(indices_reload_search_analyzers_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_reload_search_analyzers1_request, 'body'),
      ...getShapeAt(indices_reload_search_analyzers1_request, 'path'),
      ...getShapeAt(indices_reload_search_analyzers1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    indices_reload_search_analyzers_response,
    indices_reload_search_analyzers1_response,
  ]),
};
