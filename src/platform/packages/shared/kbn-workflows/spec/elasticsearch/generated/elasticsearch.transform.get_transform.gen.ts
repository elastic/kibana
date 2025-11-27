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
 * Generated at: 2025-11-27T07:04:28.259Z
 * Source: elasticsearch-specification repository, operations: transform-get-transform, transform-get-transform-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  transform_get_transform1_request,
  transform_get_transform1_response,
  transform_get_transform_request,
  transform_get_transform_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const TRANSFORM_GET_TRANSFORM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.transform.get_transform',
  connectorGroup: 'internal',
  summary: `Get transforms`,
  description: `Get transforms.

Get configuration information for transforms.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-get-transform`,
  methods: ['GET'],
  patterns: ['_transform/{transform_id}', '_transform'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-get-transform',
  parameterTypes: {
    headerParams: [],
    pathParams: ['transform_id'],
    urlParams: ['allow_no_match', 'from', 'size', 'exclude_generated'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(transform_get_transform_request, 'body'),
      ...getShapeAt(transform_get_transform_request, 'path'),
      ...getShapeAt(transform_get_transform_request, 'query'),
    }),
    z.object({
      ...getShapeAt(transform_get_transform1_request, 'body'),
      ...getShapeAt(transform_get_transform1_request, 'path'),
      ...getShapeAt(transform_get_transform1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([transform_get_transform_response, transform_get_transform1_response]),
};
