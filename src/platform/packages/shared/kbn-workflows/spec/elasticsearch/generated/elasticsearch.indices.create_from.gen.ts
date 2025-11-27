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
 * Generated at: 2025-11-27T07:43:24.874Z
 * Source: elasticsearch-specification repository, operations: indices-create-from, indices-create-from-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_create_from1_request,
  indices_create_from1_response,
  indices_create_from_request,
  indices_create_from_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_CREATE_FROM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.create_from',
  connectorGroup: 'internal',
  summary: `Create an index from a source index`,
  description: `Create an index from a source index.

Copy the mappings and settings from the source index to a destination index while allowing request settings and mappings to override the source values.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-create-from`,
  methods: ['PUT', 'POST'],
  patterns: ['_create_from/{source}/{dest}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-create-from',
  parameterTypes: {
    headerParams: [],
    pathParams: ['source', 'dest'],
    urlParams: [],
    bodyParams: ['mappings_override', 'settings_override', 'remove_index_blocks'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(indices_create_from_request, 'body'),
      ...getShapeAt(indices_create_from_request, 'path'),
      ...getShapeAt(indices_create_from_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_create_from1_request, 'body'),
      ...getShapeAt(indices_create_from1_request, 'path'),
      ...getShapeAt(indices_create_from1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([indices_create_from_response, indices_create_from1_response]),
};
