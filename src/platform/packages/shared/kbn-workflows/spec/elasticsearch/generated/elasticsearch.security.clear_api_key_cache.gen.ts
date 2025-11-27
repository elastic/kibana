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
 * Generated at: 2025-11-27T07:43:24.910Z
 * Source: elasticsearch-specification repository, operations: security-clear-api-key-cache
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_clear_api_key_cache_request,
  security_clear_api_key_cache_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_CLEAR_API_KEY_CACHE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.clear_api_key_cache',
  connectorGroup: 'internal',
  summary: `Clear the API key cache`,
  description: `Clear the API key cache.

Evict a subset of all entries from the API key cache.
The cache is also automatically cleared on state changes of the security index.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-clear-api-key-cache`,
  methods: ['POST'],
  patterns: ['_security/api_key/{ids}/_clear_cache'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-clear-api-key-cache',
  parameterTypes: {
    headerParams: [],
    pathParams: ['ids'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_clear_api_key_cache_request, 'body'),
    ...getShapeAt(security_clear_api_key_cache_request, 'path'),
    ...getShapeAt(security_clear_api_key_cache_request, 'query'),
  }),
  outputSchema: security_clear_api_key_cache_response,
};
