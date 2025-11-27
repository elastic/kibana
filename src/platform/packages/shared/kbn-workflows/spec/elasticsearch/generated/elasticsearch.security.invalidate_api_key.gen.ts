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
 * Generated at: 2025-11-27T07:43:24.915Z
 * Source: elasticsearch-specification repository, operations: security-invalidate-api-key
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_invalidate_api_key_request,
  security_invalidate_api_key_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_INVALIDATE_API_KEY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.invalidate_api_key',
  connectorGroup: 'internal',
  summary: `Invalidate API keys`,
  description: `Invalidate API keys.

This API invalidates API keys created by the create API key or grant API key APIs.
Invalidated API keys fail authentication, but they can still be viewed using the get API key information and query API key information APIs, for at least the configured retention period, until they are automatically deleted.

To use this API, you must have at least the \`manage_security\`, \`manage_api_key\`, or \`manage_own_api_key\` cluster privileges.
The \`manage_security\` privilege allows deleting any API key, including both REST and cross cluster API keys.
The \`manage_api_key\` privilege allows deleting any REST API key, but not cross cluster API keys.
The \`manage_own_api_key\` only allows deleting REST API keys that are owned by the user.
In addition, with the \`manage_own_api_key\` privilege, an invalidation request must be issued in one of the three formats:

- Set the parameter \`owner=true\`.
- Or, set both \`username\` and \`realm_name\` to match the user's identity.
- Or, if the request is issued by an API key, that is to say an API key invalidates itself, specify its ID in the \`ids\` field.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-invalidate-api-key`,
  methods: ['DELETE'],
  patterns: ['_security/api_key'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-invalidate-api-key',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['id', 'ids', 'name', 'owner', 'realm_name', 'username'],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_invalidate_api_key_request, 'body'),
    ...getShapeAt(security_invalidate_api_key_request, 'path'),
    ...getShapeAt(security_invalidate_api_key_request, 'query'),
  }),
  outputSchema: security_invalidate_api_key_response,
};
