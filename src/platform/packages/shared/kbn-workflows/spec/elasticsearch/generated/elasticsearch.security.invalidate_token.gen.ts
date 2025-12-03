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
 * Source: elasticsearch-specification repository, operations: security-invalidate-token
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_invalidate_token_request,
  security_invalidate_token_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_INVALIDATE_TOKEN_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.invalidate_token',
  summary: `Invalidate a token`,
  description: `Invalidate a token.

The access tokens returned by the get token API have a finite period of time for which they are valid.
After that time period, they can no longer be used.
The time period is defined by the \`xpack.security.authc.token.timeout\` setting.

The refresh tokens returned by the get token API are only valid for 24 hours.
They can also be used exactly once.
If you want to invalidate one or more access or refresh tokens immediately, use this invalidate token API.

NOTE: While all parameters are optional, at least one of them is required.
More specifically, either one of \`token\` or \`refresh_token\` parameters is required.
If none of these two are specified, then \`realm_name\` and/or \`username\` need to be specified.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-invalidate-token`,
  methods: ['DELETE'],
  patterns: ['_security/oauth2/token'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-invalidate-token',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['token', 'refresh_token', 'realm_name', 'username'],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_invalidate_token_request, 'body'),
    ...getShapeAt(security_invalidate_token_request, 'path'),
    ...getShapeAt(security_invalidate_token_request, 'query'),
  }),
  outputSchema: security_invalidate_token_response,
};
