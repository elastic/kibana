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
 * Source: elasticsearch-specification repository, operations: cat-shards, cat-shards-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  cat_shards1_request,
  cat_shards1_response,
  cat_shards_request,
  cat_shards_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CAT_SHARDS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.shards',
  summary: `Get shard information`,
  description: `Get shard information.

Get information about the shards in a cluster.
For data streams, the API returns information about the backing indices.
IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-shards`,
  methods: ['GET'],
  patterns: ['_cat/shards', '_cat/shards/{index}'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-shards',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: ['h', 's', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(cat_shards_request, 'body'),
      ...getShapeAt(cat_shards_request, 'path'),
      ...getShapeAt(cat_shards_request, 'query'),
    }),
    z.object({
      ...getShapeAt(cat_shards1_request, 'body'),
      ...getShapeAt(cat_shards1_request, 'path'),
      ...getShapeAt(cat_shards1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([cat_shards_response, cat_shards1_response]),
};
