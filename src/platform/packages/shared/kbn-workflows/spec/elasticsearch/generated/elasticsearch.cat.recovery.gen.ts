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
 * Generated at: 2025-11-27T07:04:28.186Z
 * Source: elasticsearch-specification repository, operations: cat-recovery, cat-recovery-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  cat_recovery1_request,
  cat_recovery1_response,
  cat_recovery_request,
  cat_recovery_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CAT_RECOVERY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.recovery',
  connectorGroup: 'internal',
  summary: `Get shard recovery information`,
  description: `Get shard recovery information.

Get information about ongoing and completed shard recoveries.
Shard recovery is the process of initializing a shard copy, such as restoring a primary shard from a snapshot or syncing a replica shard from a primary shard. When a shard recovery completes, the recovered shard is available for search and indexing.
For data streams, the API returns information about the stream’s backing indices.
IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the index recovery API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-recovery`,
  methods: ['GET'],
  patterns: ['_cat/recovery', '_cat/recovery/{index}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-recovery',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: ['active_only', 'detailed', 'index', 'h', 's'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(cat_recovery_request, 'body'),
      ...getShapeAt(cat_recovery_request, 'path'),
      ...getShapeAt(cat_recovery_request, 'query'),
    }),
    z.object({
      ...getShapeAt(cat_recovery1_request, 'body'),
      ...getShapeAt(cat_recovery1_request, 'path'),
      ...getShapeAt(cat_recovery1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([cat_recovery_response, cat_recovery1_response]),
};
