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
 * Source: elasticsearch-specification repository, operations: indices-delete-alias, indices-delete-alias-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_delete_alias1_request,
  indices_delete_alias1_response,
  indices_delete_alias_request,
  indices_delete_alias_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_DELETE_ALIAS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.delete_alias',
  summary: `Delete an alias`,
  description: `Delete an alias.

Removes a data stream or index from an alias.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-delete-alias`,
  methods: ['DELETE'],
  patterns: ['{index}/_alias/{name}', '{index}/_aliases/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-delete-alias',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index', 'name'],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(indices_delete_alias_request, 'body'),
      ...getShapeAt(indices_delete_alias_request, 'path'),
      ...getShapeAt(indices_delete_alias_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_delete_alias1_request, 'body'),
      ...getShapeAt(indices_delete_alias1_request, 'path'),
      ...getShapeAt(indices_delete_alias1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([indices_delete_alias_response, indices_delete_alias1_response]),
};
