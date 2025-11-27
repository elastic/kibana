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
 * Generated at: 2025-11-27T07:04:28.225Z
 * Source: elasticsearch-specification repository, operations: indices-shard-stores, indices-shard-stores-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_shard_stores1_request,
  indices_shard_stores1_response,
  indices_shard_stores_request,
  indices_shard_stores_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_SHARD_STORES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.shard_stores',
  connectorGroup: 'internal',
  summary: `Get index shard stores`,
  description: `Get index shard stores.

Get store information about replica shards in one or more indices.
For data streams, the API retrieves store information for the stream's backing indices.

The index shard stores API returns the following information:

* The node on which each replica shard exists.
* The allocation ID for each replica shard.
* A unique ID for each replica shard.
* Any errors encountered while opening the shard index or from an earlier failure.

By default, the API returns store information only for primary shards that are unassigned or have one or more unassigned replica shards.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-shard-stores`,
  methods: ['GET'],
  patterns: ['_shard_stores', '{index}/_shard_stores'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-shard-stores',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: ['allow_no_indices', 'expand_wildcards', 'ignore_unavailable', 'status'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(indices_shard_stores_request, 'body'),
      ...getShapeAt(indices_shard_stores_request, 'path'),
      ...getShapeAt(indices_shard_stores_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_shard_stores1_request, 'body'),
      ...getShapeAt(indices_shard_stores1_request, 'path'),
      ...getShapeAt(indices_shard_stores1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([indices_shard_stores_response, indices_shard_stores1_response]),
};
