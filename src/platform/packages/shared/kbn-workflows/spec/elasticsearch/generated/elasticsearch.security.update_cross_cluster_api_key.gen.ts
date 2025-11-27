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
 * Generated at: 2025-11-27T07:43:24.918Z
 * Source: elasticsearch-specification repository, operations: security-update-cross-cluster-api-key
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_update_cross_cluster_api_key_request,
  security_update_cross_cluster_api_key_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_UPDATE_CROSS_CLUSTER_API_KEY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.update_cross_cluster_api_key',
  connectorGroup: 'internal',
  summary: `Update a cross-cluster API key`,
  description: `Update a cross-cluster API key.

Update the attributes of an existing cross-cluster API key, which is used for API key based remote cluster access.

To use this API, you must have at least the \`manage_security\` cluster privilege.
Users can only update API keys that they created.
To update another user's API key, use the \`run_as\` feature to submit a request on behalf of another user.

IMPORTANT: It's not possible to use an API key as the authentication credential for this API.
To update an API key, the owner user's credentials are required.

It's not possible to update expired API keys, or API keys that have been invalidated by the invalidate API key API.

This API supports updates to an API key's access scope, metadata, and expiration.
The owner user's information, such as the \`username\` and \`realm\`, is also updated automatically on every call.

NOTE: This API cannot update REST API keys, which should be updated by either the update API key or bulk update API keys API.

To learn more about how to use this API, refer to the [Update cross cluter API key API examples page](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/update-cc-api-key-examples).

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-update-cross-cluster-api-key`,
  methods: ['PUT'],
  patterns: ['_security/cross_cluster/api_key/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-update-cross-cluster-api-key',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['access', 'expiration', 'metadata', 'certificate_identity'],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_update_cross_cluster_api_key_request, 'body'),
    ...getShapeAt(security_update_cross_cluster_api_key_request, 'path'),
    ...getShapeAt(security_update_cross_cluster_api_key_request, 'query'),
  }),
  outputSchema: security_update_cross_cluster_api_key_response,
};
