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
 * Source: elasticsearch-specification repository, operations: security-authenticate
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_authenticate_request,
  security_authenticate_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_AUTHENTICATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.authenticate',
  connectorGroup: 'internal',
  summary: `Authenticate a user`,
  description: `Authenticate a user.

Authenticates a user and returns information about the authenticated user.
Include the user information in a [basic auth header](https://en.wikipedia.org/wiki/Basic_access_authentication).
A successful call returns a JSON structure that shows user information such as their username, the roles that are assigned to the user, any assigned metadata, and information about the realms that authenticated and authorized the user.
If the user cannot be authenticated, this API returns a 401 status code.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-authenticate`,
  methods: ['GET'],
  patterns: ['_security/_authenticate'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-authenticate',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_authenticate_request, 'body'),
    ...getShapeAt(security_authenticate_request, 'path'),
    ...getShapeAt(security_authenticate_request, 'query'),
  }),
  outputSchema: security_authenticate_response,
};
