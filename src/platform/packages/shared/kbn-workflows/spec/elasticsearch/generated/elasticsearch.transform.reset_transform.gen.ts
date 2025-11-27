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
 * Generated at: 2025-11-27T07:43:24.925Z
 * Source: elasticsearch-specification repository, operations: transform-reset-transform
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  transform_reset_transform_request,
  transform_reset_transform_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const TRANSFORM_RESET_TRANSFORM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.transform.reset_transform',
  connectorGroup: 'internal',
  summary: `Reset a transform`,
  description: `Reset a transform.

Before you can reset it, you must stop it; alternatively, use the \`force\` query parameter.
If the destination index was created by the transform, it is deleted.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-reset-transform`,
  methods: ['POST'],
  patterns: ['_transform/{transform_id}/_reset'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-reset-transform',
  parameterTypes: {
    headerParams: [],
    pathParams: ['transform_id'],
    urlParams: ['force', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(transform_reset_transform_request, 'body'),
    ...getShapeAt(transform_reset_transform_request, 'path'),
    ...getShapeAt(transform_reset_transform_request, 'query'),
  }),
  outputSchema: transform_reset_transform_response,
};
