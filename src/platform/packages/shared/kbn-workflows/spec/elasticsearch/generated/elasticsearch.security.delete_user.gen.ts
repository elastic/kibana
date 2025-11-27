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
 * Source: elasticsearch-specification repository, operations: security-delete-user
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { security_delete_user_request, security_delete_user_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_DELETE_USER_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.delete_user',
  connectorGroup: 'internal',
  summary: `Delete users`,
  description: `Delete users.

Delete users from the native realm.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-delete-user`,
  methods: ['DELETE'],
  patterns: ['_security/user/{username}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-delete-user',
  parameterTypes: {
    headerParams: [],
    pathParams: ['username'],
    urlParams: ['refresh'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_delete_user_request, 'body'),
    ...getShapeAt(security_delete_user_request, 'path'),
    ...getShapeAt(security_delete_user_request, 'query'),
  }),
  outputSchema: security_delete_user_response,
};
