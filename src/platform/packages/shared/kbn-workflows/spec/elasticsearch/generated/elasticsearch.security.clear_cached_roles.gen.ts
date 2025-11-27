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
 * Generated at: 2025-11-27T07:43:24.911Z
 * Source: elasticsearch-specification repository, operations: security-clear-cached-roles
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_clear_cached_roles_request,
  security_clear_cached_roles_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_CLEAR_CACHED_ROLES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.clear_cached_roles',
  connectorGroup: 'internal',
  summary: `Clear the roles cache`,
  description: `Clear the roles cache.

Evict roles from the native role cache.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-clear-cached-roles`,
  methods: ['POST'],
  patterns: ['_security/role/{name}/_clear_cache'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-clear-cached-roles',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_clear_cached_roles_request, 'body'),
    ...getShapeAt(security_clear_cached_roles_request, 'path'),
    ...getShapeAt(security_clear_cached_roles_request, 'query'),
  }),
  outputSchema: security_clear_cached_roles_response,
};
