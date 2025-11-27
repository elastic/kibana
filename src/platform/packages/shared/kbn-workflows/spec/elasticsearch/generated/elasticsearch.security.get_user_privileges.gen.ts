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
 * Generated at: 2025-11-27T07:04:28.251Z
 * Source: elasticsearch-specification repository, operations: security-get-user-privileges
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_get_user_privileges_request,
  security_get_user_privileges_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_GET_USER_PRIVILEGES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.get_user_privileges',
  connectorGroup: 'internal',
  summary: `Get user privileges`,
  description: `Get user privileges.

Get the security privileges for the logged in user.
All users can use this API, but only to determine their own privileges.
To check the privileges of other users, you must use the run as feature.
To check whether a user has a specific list of privileges, use the has privileges API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-user-privileges`,
  methods: ['GET'],
  patterns: ['_security/user/_privileges'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-user-privileges',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_get_user_privileges_request, 'body'),
    ...getShapeAt(security_get_user_privileges_request, 'path'),
    ...getShapeAt(security_get_user_privileges_request, 'query'),
  }),
  outputSchema: security_get_user_privileges_response,
};
