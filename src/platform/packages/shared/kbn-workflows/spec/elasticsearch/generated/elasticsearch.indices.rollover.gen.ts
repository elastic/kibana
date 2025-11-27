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
 * Source: elasticsearch-specification repository, operations: indices-rollover, indices-rollover-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_rollover1_request,
  indices_rollover1_response,
  indices_rollover_request,
  indices_rollover_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_ROLLOVER_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.rollover',
  connectorGroup: 'internal',
  summary: `Roll over to a new index`,
  description: `Roll over to a new index.

TIP: We recommend using the index lifecycle rollover action to automate rollovers. However, Serverless does not support Index Lifecycle Management (ILM), so don't use this approach in the Serverless context.

The rollover API creates a new index for a data stream or index alias.
The API behavior depends on the rollover target.

**Roll over a data stream**

If you roll over a data stream, the API creates a new write index for the stream.
The stream's previous write index becomes a regular backing index.
A rollover also increments the data stream's generation.

**Roll over an index alias with a write index**

TIP: Prior to Elasticsearch 7.9, you'd typically use an index alias with a write index to manage time series data.
Data streams replace this functionality, require less maintenance, and automatically integrate with data tiers.

If an index alias points to multiple indices, one of the indices must be a write index.
The rollover API creates a new write index for the alias with \`is_write_index\` set to \`true\`.
The API also \`sets is_write_index\` to \`false\` for the previous write index.

**Roll over an index alias with one index**

If you roll over an index alias that points to only one index, the API creates a new index for the alias and removes the original index from the alias.

NOTE: A rollover creates a new index and is subject to the \`wait_for_active_shards\` setting.

**Increment index names for an alias**

When you roll over an index alias, you can specify a name for the new index.
If you don't specify a name and the current index ends with \`-\` and a number, such as \`my-index-000001\` or \`my-index-3\`, the new index name increments that number.
For example, if you roll over an alias with a current index of \`my-index-000001\`, the rollover creates a new index named \`my-index-000002\`.
This number is always six characters and zero-padded, regardless of the previous index's name.

If you use an index alias for time series data, you can use date math in the index name to track the rollover date.
For example, you can create an alias that points to an index named \`<my-index-{now/d}-000001>\`.
If you create the index on May 6, 2099, the index's name is \`my-index-2099.05.06-000001\`.
If you roll over the alias on May 7, 2099, the new index's name is \`my-index-2099.05.07-000002\`.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-rollover`,
  methods: ['POST'],
  patterns: ['{alias}/_rollover', '{alias}/_rollover/{new_index}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-rollover',
  parameterTypes: {
    headerParams: [],
    pathParams: ['alias', 'new_index'],
    urlParams: ['dry_run', 'master_timeout', 'timeout', 'wait_for_active_shards', 'lazy'],
    bodyParams: ['aliases', 'conditions', 'mappings', 'settings'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(indices_rollover_request, 'body'),
      ...getShapeAt(indices_rollover_request, 'path'),
      ...getShapeAt(indices_rollover_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_rollover1_request, 'body'),
      ...getShapeAt(indices_rollover1_request, 'path'),
      ...getShapeAt(indices_rollover1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([indices_rollover_response, indices_rollover1_response]),
};
