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
 * Generated at: 2025-11-27T07:43:24.917Z
 * Source: elasticsearch-specification repository, operations: security-query-user, security-query-user-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_query_user1_request,
  security_query_user1_response,
  security_query_user_request,
  security_query_user_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_QUERY_USER_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.query_user',
  connectorGroup: 'internal',
  summary: `Find users with a query`,
  description: `Find users with a query.

Get information for users in a paginated manner.
You can optionally filter the results with a query.

NOTE: As opposed to the get user API, built-in users are excluded from the result.
This API is only for native users.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-query-user`,
  methods: ['GET', 'POST'],
  patterns: ['_security/_query/user'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-query-user',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['with_profile_uid'],
    bodyParams: ['query', 'from', 'sort', 'size', 'search_after'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(security_query_user_request, 'body'),
      ...getShapeAt(security_query_user_request, 'path'),
      ...getShapeAt(security_query_user_request, 'query'),
    }),
    z.object({
      ...getShapeAt(security_query_user1_request, 'body'),
      ...getShapeAt(security_query_user1_request, 'path'),
      ...getShapeAt(security_query_user1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([security_query_user_response, security_query_user1_response]),
};
