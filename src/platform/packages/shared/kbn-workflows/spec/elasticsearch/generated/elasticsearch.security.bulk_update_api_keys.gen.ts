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
 * Source: elasticsearch-specification repository, operations: security-bulk-update-api-keys
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_bulk_update_api_keys_request,
  security_bulk_update_api_keys_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_BULK_UPDATE_API_KEYS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.bulk_update_api_keys',
  connectorGroup: 'internal',
  summary: `Bulk update API keys`,
  description: `Bulk update API keys.

Update the attributes for multiple API keys.

IMPORTANT: It is not possible to use an API key as the authentication credential for this API. To update API keys, the owner user's credentials are required.

This API is similar to the update API key API but enables you to apply the same update to multiple API keys in one API call. This operation can greatly improve performance over making individual updates.

It is not possible to update expired or invalidated API keys.

This API supports updates to API key access scope, metadata and expiration.
The access scope of each API key is derived from the \`role_descriptors\` you specify in the request and a snapshot of the owner user's permissions at the time of the request.
The snapshot of the owner's permissions is updated automatically on every call.

IMPORTANT: If you don't specify \`role_descriptors\` in the request, a call to this API might still change an API key's access scope. This change can occur if the owner user's permissions have changed since the API key was created or last modified.

A successful request returns a JSON structure that contains the IDs of all updated API keys, the IDs of API keys that already had the requested changes and did not require an update, and error details for any failed update.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-bulk-update-api-keys`,
  methods: ['POST'],
  patterns: ['_security/api_key/_bulk_update'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-bulk-update-api-keys',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['expiration', 'ids', 'metadata', 'role_descriptors'],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_bulk_update_api_keys_request, 'body'),
    ...getShapeAt(security_bulk_update_api_keys_request, 'path'),
    ...getShapeAt(security_bulk_update_api_keys_request, 'query'),
  }),
  outputSchema: security_bulk_update_api_keys_response,
};
