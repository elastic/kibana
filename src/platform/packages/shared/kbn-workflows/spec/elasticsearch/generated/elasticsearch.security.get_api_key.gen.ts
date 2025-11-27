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
 * Generated at: 2025-11-27T07:04:28.250Z
 * Source: elasticsearch-specification repository, operations: security-get-api-key
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { security_get_api_key_request, security_get_api_key_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_GET_API_KEY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.get_api_key',
  connectorGroup: 'internal',
  summary: `Get API key information`,
  description: `Get API key information.

Retrieves information for one or more API keys.
NOTE: If you have only the \`manage_own_api_key\` privilege, this API returns only the API keys that you own.
If you have \`read_security\`, \`manage_api_key\` or greater privileges (including \`manage_security\`), this API returns all API keys regardless of ownership.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-api-key`,
  methods: ['GET'],
  patterns: ['_security/api_key'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-api-key',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [
      'id',
      'name',
      'owner',
      'realm_name',
      'username',
      'with_limited_by',
      'active_only',
      'with_profile_uid',
    ],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_get_api_key_request, 'body'),
    ...getShapeAt(security_get_api_key_request, 'path'),
    ...getShapeAt(security_get_api_key_request, 'query'),
  }),
  outputSchema: security_get_api_key_response,
};
