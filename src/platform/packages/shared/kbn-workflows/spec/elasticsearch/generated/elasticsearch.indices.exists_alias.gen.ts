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
 * Generated at: 2025-11-27T07:04:28.218Z
 * Source: elasticsearch-specification repository, operations: indices-exists-alias, indices-exists-alias-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_exists_alias1_request,
  indices_exists_alias1_response,
  indices_exists_alias_request,
  indices_exists_alias_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_EXISTS_ALIAS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.exists_alias',
  connectorGroup: 'internal',
  summary: `Check aliases`,
  description: `Check aliases.

Check if one or more data stream or index aliases exist.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-exists-alias`,
  methods: ['HEAD'],
  patterns: ['_alias/{name}', '{index}/_alias/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-exists-alias',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name', 'index'],
    urlParams: ['allow_no_indices', 'expand_wildcards', 'ignore_unavailable', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(indices_exists_alias_request, 'body'),
      ...getShapeAt(indices_exists_alias_request, 'path'),
      ...getShapeAt(indices_exists_alias_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_exists_alias1_request, 'body'),
      ...getShapeAt(indices_exists_alias1_request, 'path'),
      ...getShapeAt(indices_exists_alias1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([indices_exists_alias_response, indices_exists_alias1_response]),
};
