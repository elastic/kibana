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
 * Source: elasticsearch-specification repository, operations: security-activate-user-profile
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_activate_user_profile_request,
  security_activate_user_profile_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_ACTIVATE_USER_PROFILE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.activate_user_profile',
  connectorGroup: 'internal',
  summary: `Activate a user profile`,
  description: `Activate a user profile.

Create or update a user profile on behalf of another user.

NOTE: The user profile feature is designed only for use by Kibana and Elastic's Observability, Enterprise Search, and Elastic Security solutions.
Individual users and external applications should not call this API directly.
The calling application must have either an \`access_token\` or a combination of \`username\` and \`password\` for the user that the profile document is intended for.
Elastic reserves the right to change or remove this feature in future releases without prior notice.

This API creates or updates a profile document for end users with information that is extracted from the user's authentication object including \`username\`, \`full_name,\` \`roles\`, and the authentication realm.
For example, in the JWT \`access_token\` case, the profile user's \`username\` is extracted from the JWT token claim pointed to by the \`claims.principal\` setting of the JWT realm that authenticated the token.

When updating a profile document, the API enables the document if it was disabled.
Any updates do not change existing content for either the \`labels\` or \`data\` fields.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-activate-user-profile`,
  methods: ['POST'],
  patterns: ['_security/profile/_activate'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-activate-user-profile',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['access_token', 'grant_type', 'password', 'username'],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_activate_user_profile_request, 'body'),
    ...getShapeAt(security_activate_user_profile_request, 'path'),
    ...getShapeAt(security_activate_user_profile_request, 'query'),
  }),
  outputSchema: security_activate_user_profile_response,
};
