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
 * Generated at: 2025-11-27T07:43:24.884Z
 * Source: elasticsearch-specification repository, operations: indices-split, indices-split-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_split1_request,
  indices_split1_response,
  indices_split_request,
  indices_split_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_SPLIT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.split',
  connectorGroup: 'internal',
  summary: `Split an index`,
  description: `Split an index.

Split an index into a new index with more primary shards.
* Before you can split an index:

* The index must be read-only.
* The cluster health status must be green.

You can do make an index read-only with the following request using the add index block API:

\`\`\`
PUT /my_source_index/_block/write
\`\`\`

The current write index on a data stream cannot be split.
In order to split the current write index, the data stream must first be rolled over so that a new write index is created and then the previous write index can be split.

The number of times the index can be split (and the number of shards that each original shard can be split into) is determined by the \`index.number_of_routing_shards\` setting.
The number of routing shards specifies the hashing space that is used internally to distribute documents across shards with consistent hashing.
For instance, a 5 shard index with \`number_of_routing_shards\` set to 30 (5 x 2 x 3) could be split by a factor of 2 or 3.

A split operation:

* Creates a new target index with the same definition as the source index, but with a larger number of primary shards.
* Hard-links segments from the source index into the target index. If the file system doesn't support hard-linking, all segments are copied into the new index, which is a much more time consuming process.
* Hashes all documents again, after low level files are created, to delete documents that belong to a different shard.
* Recovers the target index as though it were a closed index which had just been re-opened.

IMPORTANT: Indices can only be split if they satisfy the following requirements:

* The target index must not exist.
* The source index must have fewer primary shards than the target index.
* The number of primary shards in the target index must be a multiple of the number of primary shards in the source index.
* The node handling the split process must have sufficient free disk space to accommodate a second copy of the existing index.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-split`,
  methods: ['PUT', 'POST'],
  patterns: ['{index}/_split/{target}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-split',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index', 'target'],
    urlParams: ['master_timeout', 'timeout', 'wait_for_active_shards'],
    bodyParams: ['aliases', 'settings'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(indices_split_request, 'body'),
      ...getShapeAt(indices_split_request, 'path'),
      ...getShapeAt(indices_split_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_split1_request, 'body'),
      ...getShapeAt(indices_split1_request, 'path'),
      ...getShapeAt(indices_split1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([indices_split_response, indices_split1_response]),
};
