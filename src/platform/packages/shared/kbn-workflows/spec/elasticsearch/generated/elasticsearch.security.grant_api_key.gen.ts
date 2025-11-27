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
 * Generated at: 2025-11-27T07:43:24.914Z
 * Source: elasticsearch-specification repository, operations: security-grant-api-key
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_grant_api_key_request,
  security_grant_api_key_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_GRANT_API_KEY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.grant_api_key',
  connectorGroup: 'internal',
  summary: `Grant an API key`,
  description: `Grant an API key.

Create an API key on behalf of another user.
This API is similar to the create API keys API, however it creates the API key for a user that is different than the user that runs the API.
The caller must have authentication credentials for the user on whose behalf the API key will be created.
It is not possible to use this API to create an API key without that user's credentials.
The supported user authentication credential types are:

* username and password
* Elasticsearch access tokens
* JWTs

The user, for whom the authentication credentials is provided, can optionally "run as" (impersonate) another user.
In this case, the API key will be created on behalf of the impersonated user.

This API is intended be used by applications that need to create and manage API keys for end users, but cannot guarantee that those users have permission to create API keys on their own behalf.
The API keys are created by the Elasticsearch API key service, which is automatically enabled.

A successful grant API key API call returns a JSON structure that contains the API key, its unique id, and its name.
If applicable, it also returns expiration information for the API key in milliseconds.

By default, API keys never expire. You can specify expiration information when you create the API keys.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-grant-api-key`,
  methods: ['POST'],
  patterns: ['_security/api_key/grant'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-grant-api-key',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['refresh'],
    bodyParams: ['api_key', 'grant_type', 'access_token', 'username', 'password', 'run_as'],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_grant_api_key_request, 'body'),
    ...getShapeAt(security_grant_api_key_request, 'path'),
    ...getShapeAt(security_grant_api_key_request, 'query'),
  }),
  outputSchema: security_grant_api_key_response,
};
