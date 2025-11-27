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
 * Generated at: 2025-11-27T07:04:28.252Z
 * Source: elasticsearch-specification repository, operations: security-put-user, security-put-user-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_put_user1_request,
  security_put_user1_response,
  security_put_user_request,
  security_put_user_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_PUT_USER_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.put_user',
  connectorGroup: 'internal',
  summary: `Create or update users`,
  description: `Create or update users.

Add and update users in the native realm.
A password is required for adding a new user but is optional when updating an existing user.
To change a user's password without updating any other fields, use the change password API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-put-user`,
  methods: ['PUT', 'POST'],
  patterns: ['_security/user/{username}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-put-user',
  parameterTypes: {
    headerParams: [],
    pathParams: ['username'],
    urlParams: ['refresh'],
    bodyParams: [
      'username',
      'email',
      'full_name',
      'metadata',
      'password',
      'password_hash',
      'roles',
      'enabled',
    ],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(security_put_user_request, 'body'),
      ...getShapeAt(security_put_user_request, 'path'),
      ...getShapeAt(security_put_user_request, 'query'),
    }),
    z.object({
      ...getShapeAt(security_put_user1_request, 'body'),
      ...getShapeAt(security_put_user1_request, 'path'),
      ...getShapeAt(security_put_user1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([security_put_user_response, security_put_user1_response]),
};
