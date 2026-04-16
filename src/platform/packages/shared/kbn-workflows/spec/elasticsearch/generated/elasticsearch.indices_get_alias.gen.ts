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
 * Source: elasticsearch-specification repository, operations: indices-get-alias, indices-get-alias-1, indices-get-alias-2, indices-get-alias-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_get_alias1_request,
  indices_get_alias1_response,
  indices_get_alias2_request,
  indices_get_alias2_response,
  indices_get_alias3_request,
  indices_get_alias3_response,
  indices_get_alias_request,
  indices_get_alias_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_GET_ALIAS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.get_alias',
  summary: `Get aliases`,
  description: `Get aliases.

Retrieves information for one or more data stream or index aliases.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-alias`,
  methods: ['GET'],
  patterns: ['_alias', '_alias/{name}', '{index}/_alias/{name}', '{index}/_alias'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-get-alias',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name', 'index'],
    urlParams: ['allow_no_indices', 'expand_wildcards', 'ignore_unavailable', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(indices_get_alias_request, 'body'),
      ...getShapeAt(indices_get_alias_request, 'path'),
      ...getShapeAt(indices_get_alias_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_get_alias1_request, 'body'),
      ...getShapeAt(indices_get_alias1_request, 'path'),
      ...getShapeAt(indices_get_alias1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_get_alias2_request, 'body'),
      ...getShapeAt(indices_get_alias2_request, 'path'),
      ...getShapeAt(indices_get_alias2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_get_alias3_request, 'body'),
      ...getShapeAt(indices_get_alias3_request, 'path'),
      ...getShapeAt(indices_get_alias3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    indices_get_alias_response,
    indices_get_alias1_response,
    indices_get_alias2_response,
    indices_get_alias3_response,
  ]),
};
