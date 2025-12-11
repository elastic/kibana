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
 * Source: elasticsearch-specification repository, operations: security-get-token
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_get_token_request,
  security_get_token_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_GET_TOKEN_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.get_token',
  summary: `Get a token`,
  description: `Get a token.

Create a bearer token for access without requiring basic authentication.
The tokens are created by the Elasticsearch Token Service, which is automatically enabled when you configure TLS on the HTTP interface.
Alternatively, you can explicitly enable the \`xpack.security.authc.token.enabled\` setting.
When you are running in production mode, a bootstrap check prevents you from enabling the token service unless you also enable TLS on the HTTP interface.

The get token API takes the same parameters as a typical OAuth 2.0 token API except for the use of a JSON request body.

A successful get token API call returns a JSON structure that contains the access token, the amount of time (seconds) that the token expires in, the type, and the scope if available.

The tokens returned by the get token API have a finite period of time for which they are valid and after that time period, they can no longer be used.
That time period is defined by the \`xpack.security.authc.token.timeout\` setting.
If you want to invalidate a token immediately, you can do so by using the invalidate token API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-token`,
  methods: ['POST'],
  patterns: ['_security/oauth2/token'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-token',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['grant_type', 'scope', 'password', 'kerberos_ticket', 'refresh_token', 'username'],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_get_token_request, 'body'),
    ...getShapeAt(security_get_token_request, 'path'),
    ...getShapeAt(security_get_token_request, 'query'),
  }),
  outputSchema: security_get_token_response,
};
