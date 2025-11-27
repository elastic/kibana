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
 * Generated at: 2025-11-27T07:04:28.223Z
 * Source: elasticsearch-specification repository, operations: indices-put-alias, indices-put-alias-1, indices-put-alias-2, indices-put-alias-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_put_alias1_request,
  indices_put_alias1_response,
  indices_put_alias2_request,
  indices_put_alias2_response,
  indices_put_alias3_request,
  indices_put_alias3_response,
  indices_put_alias_request,
  indices_put_alias_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_PUT_ALIAS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.put_alias',
  connectorGroup: 'internal',
  summary: `Create or update an alias`,
  description: `Create or update an alias.

Adds a data stream or index to an alias.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-alias`,
  methods: ['PUT', 'POST'],
  patterns: ['{index}/_alias/{name}', '{index}/_aliases/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-alias',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index', 'name'],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: ['filter', 'index_routing', 'is_write_index', 'routing', 'search_routing'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(indices_put_alias_request, 'body'),
      ...getShapeAt(indices_put_alias_request, 'path'),
      ...getShapeAt(indices_put_alias_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_put_alias1_request, 'body'),
      ...getShapeAt(indices_put_alias1_request, 'path'),
      ...getShapeAt(indices_put_alias1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_put_alias2_request, 'body'),
      ...getShapeAt(indices_put_alias2_request, 'path'),
      ...getShapeAt(indices_put_alias2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_put_alias3_request, 'body'),
      ...getShapeAt(indices_put_alias3_request, 'path'),
      ...getShapeAt(indices_put_alias3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    indices_put_alias_response,
    indices_put_alias1_response,
    indices_put_alias2_response,
    indices_put_alias3_response,
  ]),
};
