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
 * Source: elasticsearch-specification repository, operations: indices-get-mapping, indices-get-mapping-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_get_mapping1_request,
  indices_get_mapping1_response,
  indices_get_mapping_request,
  indices_get_mapping_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_GET_MAPPING_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.get_mapping',
  summary: `Get mapping definitions`,
  description: `Get mapping definitions.

For data streams, the API retrieves mappings for the stream’s backing indices.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-mapping`,
  methods: ['GET'],
  patterns: ['_mapping', '{index}/_mapping'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-mapping',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [
      'allow_no_indices',
      'expand_wildcards',
      'ignore_unavailable',
      'local',
      'master_timeout',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(indices_get_mapping_request, 'body'),
      ...getShapeAt(indices_get_mapping_request, 'path'),
      ...getShapeAt(indices_get_mapping_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_get_mapping1_request, 'body'),
      ...getShapeAt(indices_get_mapping1_request, 'path'),
      ...getShapeAt(indices_get_mapping1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([indices_get_mapping_response, indices_get_mapping1_response]),
};
