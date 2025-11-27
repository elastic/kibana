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
 * Source: elasticsearch-specification repository, operations: security-create-api-key, security-create-api-key-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_create_api_key1_request,
  security_create_api_key1_response,
  security_create_api_key_request,
  security_create_api_key_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_CREATE_API_KEY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.create_api_key',
  connectorGroup: 'internal',
  summary: `Create an API key`,
  description: `Create an API key.

Create an API key for access without requiring basic authentication.

IMPORTANT: If the credential that is used to authenticate this request is an API key, the derived API key cannot have any privileges.
If you specify privileges, the API returns an error.

A successful request returns a JSON structure that contains the API key, its unique id, and its name.
If applicable, it also returns expiration information for the API key in milliseconds.

NOTE: By default, API keys never expire. You can specify expiration information when you create the API keys.

The API keys are created by the Elasticsearch API key service, which is automatically enabled.
To configure or turn off the API key service, refer to API key service setting documentation.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-create-api-key`,
  methods: ['PUT', 'POST'],
  patterns: ['_security/api_key'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-create-api-key',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['refresh'],
    bodyParams: ['expiration', 'name', 'role_descriptors', 'metadata'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(security_create_api_key_request, 'body'),
      ...getShapeAt(security_create_api_key_request, 'path'),
      ...getShapeAt(security_create_api_key_request, 'query'),
    }),
    z.object({
      ...getShapeAt(security_create_api_key1_request, 'body'),
      ...getShapeAt(security_create_api_key1_request, 'path'),
      ...getShapeAt(security_create_api_key1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([security_create_api_key_response, security_create_api_key1_response]),
};
