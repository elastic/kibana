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
 * Source: elasticsearch-specification repository, operations: security-has-privileges-user-profile, security-has-privileges-user-profile-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_has_privileges_user_profile1_request,
  security_has_privileges_user_profile1_response,
  security_has_privileges_user_profile_request,
  security_has_privileges_user_profile_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_HAS_PRIVILEGES_USER_PROFILE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.has_privileges_user_profile',
  summary: `Check user profile privileges`,
  description: `Check user profile privileges.

Determine whether the users associated with the specified user profile IDs have all the requested privileges.

NOTE: The user profile feature is designed only for use by Kibana and Elastic's Observability, Enterprise Search, and Elastic Security solutions. Individual users and external applications should not call this API directly.
Elastic reserves the right to change or remove this feature in future releases without prior notice.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-has-privileges-user-profile`,
  methods: ['GET', 'POST'],
  patterns: ['_security/profile/_has_privileges'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-has-privileges-user-profile',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['uids', 'privileges'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(security_has_privileges_user_profile_request, 'body'),
      ...getShapeAt(security_has_privileges_user_profile_request, 'path'),
      ...getShapeAt(security_has_privileges_user_profile_request, 'query'),
    }),
    z.object({
      ...getShapeAt(security_has_privileges_user_profile1_request, 'body'),
      ...getShapeAt(security_has_privileges_user_profile1_request, 'path'),
      ...getShapeAt(security_has_privileges_user_profile1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    security_has_privileges_user_profile_response,
    security_has_privileges_user_profile1_response,
  ]),
};
