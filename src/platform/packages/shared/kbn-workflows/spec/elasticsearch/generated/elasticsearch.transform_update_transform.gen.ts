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
 * Source: elasticsearch-specification repository, operations: transform-update-transform
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  transform_update_transform_request,
  transform_update_transform_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const TRANSFORM_UPDATE_TRANSFORM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.transform.update_transform',
  summary: `Update a transform`,
  description: `Update a transform.

Updates certain properties of a transform.

All updated properties except \`description\` do not take effect until after the transform starts the next checkpoint,
thus there is data consistency in each checkpoint. To use this API, you must have \`read\` and \`view_index_metadata\`
privileges for the source indices. You must also have \`index\` and \`read\` privileges for the destination index. When
Elasticsearch security features are enabled, the transform remembers which roles the user who updated it had at the
time of update and runs with those privileges.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-update-transform`,
  methods: ['POST'],
  patterns: ['_transform/{transform_id}/_update'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-update-transform',
  parameterTypes: {
    headerParams: [],
    pathParams: ['transform_id'],
    urlParams: ['defer_validation', 'timeout'],
    bodyParams: [
      'dest',
      'description',
      'frequency',
      '_meta',
      'source',
      'settings',
      'sync',
      'retention_policy',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(transform_update_transform_request, 'body'),
    ...getShapeAt(transform_update_transform_request, 'path'),
    ...getShapeAt(transform_update_transform_request, 'query'),
  }),
  outputSchema: transform_update_transform_response,
};
