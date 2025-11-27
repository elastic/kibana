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
 * Generated at: 2025-11-27T07:43:24.904Z
 * Source: elasticsearch-specification repository, operations: mtermvectors, mtermvectors-1, mtermvectors-2, mtermvectors-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  mtermvectors1_request,
  mtermvectors1_response,
  mtermvectors2_request,
  mtermvectors2_response,
  mtermvectors3_request,
  mtermvectors3_response,
  mtermvectors_request,
  mtermvectors_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const MTERMVECTORS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.mtermvectors',
  connectorGroup: 'internal',
  summary: `Get multiple term vectors`,
  description: `Get multiple term vectors.

Get multiple term vectors with a single request.
You can specify existing documents by index and ID or provide artificial documents in the body of the request.
You can specify the index in the request body or request URI.
The response contains a \`docs\` array with all the fetched termvectors.
Each element has the structure provided by the termvectors API.

**Artificial documents**

You can also use \`mtermvectors\` to generate term vectors for artificial documents provided in the body of the request.
The mapping used is determined by the specified \`_index\`.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-mtermvectors`,
  methods: ['GET', 'POST'],
  patterns: ['_mtermvectors', '{index}/_mtermvectors'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-mtermvectors',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [
      'ids',
      'fields',
      'field_statistics',
      'offsets',
      'payloads',
      'positions',
      'preference',
      'realtime',
      'routing',
      'term_statistics',
      'version',
      'version_type',
    ],
    bodyParams: ['docs', 'ids'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(mtermvectors_request, 'body'),
      ...getShapeAt(mtermvectors_request, 'path'),
      ...getShapeAt(mtermvectors_request, 'query'),
    }),
    z.object({
      ...getShapeAt(mtermvectors1_request, 'body'),
      ...getShapeAt(mtermvectors1_request, 'path'),
      ...getShapeAt(mtermvectors1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(mtermvectors2_request, 'body'),
      ...getShapeAt(mtermvectors2_request, 'path'),
      ...getShapeAt(mtermvectors2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(mtermvectors3_request, 'body'),
      ...getShapeAt(mtermvectors3_request, 'path'),
      ...getShapeAt(mtermvectors3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    mtermvectors_response,
    mtermvectors1_response,
    mtermvectors2_response,
    mtermvectors3_response,
  ]),
};
