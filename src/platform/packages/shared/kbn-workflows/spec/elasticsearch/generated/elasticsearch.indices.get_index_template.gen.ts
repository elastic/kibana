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
 * Source: elasticsearch-specification repository, operations: indices-get-index-template, indices-get-index-template-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_get_index_template1_request,
  indices_get_index_template1_response,
  indices_get_index_template_request,
  indices_get_index_template_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_GET_INDEX_TEMPLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.get_index_template',
  summary: `Get index templates`,
  description: `Get index templates.

Get information about one or more index templates.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-index-template`,
  methods: ['GET'],
  patterns: ['_index_template', '_index_template/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-index-template',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['local', 'flat_settings', 'master_timeout', 'include_defaults'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(indices_get_index_template_request, 'body'),
      ...getShapeAt(indices_get_index_template_request, 'path'),
      ...getShapeAt(indices_get_index_template_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_get_index_template1_request, 'body'),
      ...getShapeAt(indices_get_index_template1_request, 'path'),
      ...getShapeAt(indices_get_index_template1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    indices_get_index_template_response,
    indices_get_index_template1_response,
  ]),
};
