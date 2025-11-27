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
 * Generated at: 2025-11-27T07:04:28.248Z
 * Source: elasticsearch-specification repository, operations: security-clear-cached-service-tokens
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_clear_cached_service_tokens_request,
  security_clear_cached_service_tokens_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_CLEAR_CACHED_SERVICE_TOKENS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.clear_cached_service_tokens',
  connectorGroup: 'internal',
  summary: `Clear service account token caches`,
  description: `Clear service account token caches.

Evict a subset of all entries from the service account token caches.
Two separate caches exist for service account tokens: one cache for tokens backed by the \`service_tokens\` file, and another for tokens backed by the \`.security\` index.
This API clears matching entries from both caches.

The cache for service account tokens backed by the \`.security\` index is cleared automatically on state changes of the security index.
The cache for tokens backed by the \`service_tokens\` file is cleared automatically on file changes.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-clear-cached-service-tokens`,
  methods: ['POST'],
  patterns: ['_security/service/{namespace}/{service}/credential/token/{name}/_clear_cache'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-clear-cached-service-tokens',
  parameterTypes: {
    headerParams: [],
    pathParams: ['namespace', 'service', 'name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_clear_cached_service_tokens_request, 'body'),
    ...getShapeAt(security_clear_cached_service_tokens_request, 'path'),
    ...getShapeAt(security_clear_cached_service_tokens_request, 'query'),
  }),
  outputSchema: security_clear_cached_service_tokens_response,
};
