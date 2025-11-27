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
 * Source: elasticsearch-specification repository, operations: cat-count, cat-count-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  cat_count1_request,
  cat_count1_response,
  cat_count_request,
  cat_count_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CAT_COUNT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.count',
  connectorGroup: 'internal',
  summary: `Get a document count`,
  description: `Get a document count.

Get quick access to a document count for a data stream, an index, or an entire cluster.
The document count only includes live documents, not deleted documents which have not yet been removed by the merge process.

IMPORTANT: CAT APIs are only intended for human consumption using the command line or Kibana console.
They are not intended for use by applications. For application consumption, use the count API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-count`,
  methods: ['GET'],
  patterns: ['_cat/count', '_cat/count/{index}'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-count',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: ['h', 's'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(cat_count_request, 'body'),
      ...getShapeAt(cat_count_request, 'path'),
      ...getShapeAt(cat_count_request, 'query'),
    }),
    z.object({
      ...getShapeAt(cat_count1_request, 'body'),
      ...getShapeAt(cat_count1_request, 'path'),
      ...getShapeAt(cat_count1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([cat_count_response, cat_count1_response]),
};
