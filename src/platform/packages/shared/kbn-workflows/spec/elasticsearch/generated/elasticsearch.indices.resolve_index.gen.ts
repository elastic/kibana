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
 * Generated at: 2025-11-27T07:04:28.225Z
 * Source: elasticsearch-specification repository, operations: indices-resolve-index
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_resolve_index_request,
  indices_resolve_index_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_RESOLVE_INDEX_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.resolve_index',
  connectorGroup: 'internal',
  summary: `Resolve indices`,
  description: `Resolve indices.

Resolve the names and/or index patterns for indices, aliases, and data streams.
Multiple patterns and remote clusters are supported.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-resolve-index`,
  methods: ['GET'],
  patterns: ['_resolve/index/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-resolve-index',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['expand_wildcards', 'ignore_unavailable', 'allow_no_indices', 'mode'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(indices_resolve_index_request, 'body'),
    ...getShapeAt(indices_resolve_index_request, 'path'),
    ...getShapeAt(indices_resolve_index_request, 'query'),
  }),
  outputSchema: indices_resolve_index_response,
};
