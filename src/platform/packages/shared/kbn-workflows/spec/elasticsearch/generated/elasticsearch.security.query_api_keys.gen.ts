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
 * Generated at: 2025-11-27T07:43:24.916Z
 * Source: elasticsearch-specification repository, operations: security-query-api-keys, security-query-api-keys-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_query_api_keys1_request,
  security_query_api_keys1_response,
  security_query_api_keys_request,
  security_query_api_keys_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_QUERY_API_KEYS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.query_api_keys',
  connectorGroup: 'internal',
  summary: `Find API keys with a query`,
  description: `Find API keys with a query.

Get a paginated list of API keys and their information.
You can optionally filter the results with a query.

To use this API, you must have at least the \`manage_own_api_key\` or the \`read_security\` cluster privileges.
If you have only the \`manage_own_api_key\` privilege, this API returns only the API keys that you own.
If you have the \`read_security\`, \`manage_api_key\`, or greater privileges (including \`manage_security\`), this API returns all API keys regardless of ownership.
Refer to the linked documentation for examples of how to find API keys:

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-query-api-keys`,
  methods: ['GET', 'POST'],
  patterns: ['_security/_query/api_key'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-query-api-keys',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['with_limited_by', 'with_profile_uid', 'typed_keys'],
    bodyParams: ['aggregations', 'query', 'from', 'sort', 'size', 'search_after'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(security_query_api_keys_request, 'body'),
      ...getShapeAt(security_query_api_keys_request, 'path'),
      ...getShapeAt(security_query_api_keys_request, 'query'),
    }),
    z.object({
      ...getShapeAt(security_query_api_keys1_request, 'body'),
      ...getShapeAt(security_query_api_keys1_request, 'path'),
      ...getShapeAt(security_query_api_keys1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([security_query_api_keys_response, security_query_api_keys1_response]),
};
