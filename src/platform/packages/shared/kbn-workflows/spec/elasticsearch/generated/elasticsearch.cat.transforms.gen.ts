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
 * Generated at: 2025-11-27T07:43:24.858Z
 * Source: elasticsearch-specification repository, operations: cat-transforms, cat-transforms-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  cat_transforms1_request,
  cat_transforms1_response,
  cat_transforms_request,
  cat_transforms_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CAT_TRANSFORMS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.transforms',
  connectorGroup: 'internal',
  summary: `Get transform information`,
  description: `Get transform information.

Get configuration and usage information about transforms.

CAT APIs are only intended for human consumption using the Kibana
console or command line. They are not intended for use by applications. For
application consumption, use the get transform statistics API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-transforms`,
  methods: ['GET'],
  patterns: ['_cat/transforms', '_cat/transforms/{transform_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-transforms',
  parameterTypes: {
    headerParams: [],
    pathParams: ['transform_id'],
    urlParams: ['allow_no_match', 'from', 'h', 's', 'size'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(cat_transforms_request, 'body'),
      ...getShapeAt(cat_transforms_request, 'path'),
      ...getShapeAt(cat_transforms_request, 'query'),
    }),
    z.object({
      ...getShapeAt(cat_transforms1_request, 'body'),
      ...getShapeAt(cat_transforms1_request, 'path'),
      ...getShapeAt(cat_transforms1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([cat_transforms_response, cat_transforms1_response]),
};
