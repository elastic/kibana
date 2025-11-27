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
 * Generated at: 2025-11-27T07:04:28.253Z
 * Source: elasticsearch-specification repository, operations: security-update-api-key
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_update_api_key_request,
  security_update_api_key_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_UPDATE_API_KEY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.update_api_key',
  connectorGroup: 'internal',
  summary: `Update an API key`,
  description: `Update an API key.

Update attributes of an existing API key.
This API supports updates to an API key's access scope, expiration, and metadata.

To use this API, you must have at least the \`manage_own_api_key\` cluster privilege.
Users can only update API keys that they created or that were granted to them.
To update another user’s API key, use the \`run_as\` feature to submit a request on behalf of another user.

IMPORTANT: It's not possible to use an API key as the authentication credential for this API. The owner user’s credentials are required.

Use this API to update API keys created by the create API key or grant API Key APIs.
If you need to apply the same update to many API keys, you can use the bulk update API keys API to reduce overhead.
It's not possible to update expired API keys or API keys that have been invalidated by the invalidate API key API.

The access scope of an API key is derived from the \`role_descriptors\` you specify in the request and a snapshot of the owner user's permissions at the time of the request.
The snapshot of the owner's permissions is updated automatically on every call.

IMPORTANT: If you don't specify \`role_descriptors\` in the request, a call to this API might still change the API key's access scope.
This change can occur if the owner user's permissions have changed since the API key was created or last modified.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-update-api-key`,
  methods: ['PUT'],
  patterns: ['_security/api_key/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-update-api-key',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['role_descriptors', 'metadata', 'expiration'],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_update_api_key_request, 'body'),
    ...getShapeAt(security_update_api_key_request, 'path'),
    ...getShapeAt(security_update_api_key_request, 'query'),
  }),
  outputSchema: security_update_api_key_response,
};
