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
 * Source: elasticsearch-specification repository, operations: cat-indices, cat-indices-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  cat_indices1_request,
  cat_indices1_response,
  cat_indices_request,
  cat_indices_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CAT_INDICES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.indices',
  summary: `Get index information`,
  description: `Get index information.

Get high-level information about indices in a cluster, including backing indices for data streams.

Use this request to get the following information for each index in a cluster:
- shard count
- document count
- deleted document count
- primary store size
- total store size of all shards, including shard replicas

These metrics are retrieved directly from Lucene, which Elasticsearch uses internally to power indexing and search. As a result, all document counts include hidden nested documents.
To get an accurate count of Elasticsearch documents, use the cat count or count APIs.

CAT APIs are only intended for human consumption using the command line or Kibana console.
They are not intended for use by applications. For application consumption, use an index endpoint.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-indices`,
  methods: ['GET'],
  patterns: ['_cat/indices', '_cat/indices/{index}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-indices',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [
      'expand_wildcards',
      'health',
      'include_unloaded_segments',
      'pri',
      'master_timeout',
      'h',
      's',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(cat_indices_request, 'body'),
      ...getShapeAt(cat_indices_request, 'path'),
      ...getShapeAt(cat_indices_request, 'query'),
    }),
    z.object({
      ...getShapeAt(cat_indices1_request, 'body'),
      ...getShapeAt(cat_indices1_request, 'path'),
      ...getShapeAt(cat_indices1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([cat_indices_response, cat_indices1_response]),
};
