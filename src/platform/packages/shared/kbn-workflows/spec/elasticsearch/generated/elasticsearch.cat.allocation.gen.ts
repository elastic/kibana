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
 * Generated at: 2025-11-27T07:43:24.854Z
 * Source: elasticsearch-specification repository, operations: cat-allocation, cat-allocation-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  cat_allocation1_request,
  cat_allocation1_response,
  cat_allocation_request,
  cat_allocation_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CAT_ALLOCATION_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.allocation',
  connectorGroup: 'internal',
  summary: `Get shard allocation information`,
  description: `Get shard allocation information.

Get a snapshot of the number of shards allocated to each data node and their disk space.

IMPORTANT: CAT APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-allocation`,
  methods: ['GET'],
  patterns: ['_cat/allocation', '_cat/allocation/{node_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-allocation',
  parameterTypes: {
    headerParams: [],
    pathParams: ['node_id'],
    urlParams: ['h', 's', 'local', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(cat_allocation_request, 'body'),
      ...getShapeAt(cat_allocation_request, 'path'),
      ...getShapeAt(cat_allocation_request, 'query'),
    }),
    z.object({
      ...getShapeAt(cat_allocation1_request, 'body'),
      ...getShapeAt(cat_allocation1_request, 'path'),
      ...getShapeAt(cat_allocation1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([cat_allocation_response, cat_allocation1_response]),
};
