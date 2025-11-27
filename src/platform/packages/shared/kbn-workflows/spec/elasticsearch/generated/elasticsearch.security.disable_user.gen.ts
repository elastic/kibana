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
 * Generated at: 2025-11-27T07:04:28.249Z
 * Source: elasticsearch-specification repository, operations: security-disable-user, security-disable-user-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_disable_user1_request,
  security_disable_user1_response,
  security_disable_user_request,
  security_disable_user_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_DISABLE_USER_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.disable_user',
  connectorGroup: 'internal',
  summary: `Disable users`,
  description: `Disable users.

Disable users in the native realm.
By default, when you create users, they are enabled.
You can use this API to revoke a user's access to Elasticsearch.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-disable-user`,
  methods: ['PUT', 'POST'],
  patterns: ['_security/user/{username}/_disable'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-disable-user',
  parameterTypes: {
    headerParams: [],
    pathParams: ['username'],
    urlParams: ['refresh'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(security_disable_user_request, 'body'),
      ...getShapeAt(security_disable_user_request, 'path'),
      ...getShapeAt(security_disable_user_request, 'query'),
    }),
    z.object({
      ...getShapeAt(security_disable_user1_request, 'body'),
      ...getShapeAt(security_disable_user1_request, 'path'),
      ...getShapeAt(security_disable_user1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([security_disable_user_response, security_disable_user1_response]),
};
