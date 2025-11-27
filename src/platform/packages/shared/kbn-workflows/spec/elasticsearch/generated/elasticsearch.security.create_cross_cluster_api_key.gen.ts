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
 * Source: elasticsearch-specification repository, operations: security-create-cross-cluster-api-key
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_create_cross_cluster_api_key_request,
  security_create_cross_cluster_api_key_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_CREATE_CROSS_CLUSTER_API_KEY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.create_cross_cluster_api_key',
  connectorGroup: 'internal',
  summary: `Create a cross-cluster API key`,
  description: `Create a cross-cluster API key.

Create an API key of the \`cross_cluster\` type for the API key based remote cluster access.
A \`cross_cluster\` API key cannot be used to authenticate through the REST interface.

IMPORTANT: To authenticate this request you must use a credential that is not an API key. Even if you use an API key that has the required privilege, the API returns an error.

Cross-cluster API keys are created by the Elasticsearch API key service, which is automatically enabled.

NOTE: Unlike REST API keys, a cross-cluster API key does not capture permissions of the authenticated user. The API key’s effective permission is exactly as specified with the \`access\` property.

A successful request returns a JSON structure that contains the API key, its unique ID, and its name. If applicable, it also returns expiration information for the API key in milliseconds.

By default, API keys never expire. You can specify expiration information when you create the API keys.

Cross-cluster API keys can only be updated with the update cross-cluster API key API.
Attempting to update them with the update REST API key API or the bulk update REST API keys API will result in an error.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-create-cross-cluster-api-key`,
  methods: ['POST'],
  patterns: ['_security/cross_cluster/api_key'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-create-cross-cluster-api-key',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['access', 'expiration', 'metadata', 'name', 'certificate_identity'],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_create_cross_cluster_api_key_request, 'body'),
    ...getShapeAt(security_create_cross_cluster_api_key_request, 'path'),
    ...getShapeAt(security_create_cross_cluster_api_key_request, 'query'),
  }),
  outputSchema: security_create_cross_cluster_api_key_response,
};
