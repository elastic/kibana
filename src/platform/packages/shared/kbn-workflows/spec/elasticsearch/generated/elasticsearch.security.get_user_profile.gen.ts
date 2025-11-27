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
 * Source: elasticsearch-specification repository, operations: security-get-user-profile
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_get_user_profile_request,
  security_get_user_profile_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_GET_USER_PROFILE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.get_user_profile',
  connectorGroup: 'internal',
  summary: `Get a user profile`,
  description: `Get a user profile.

Get a user's profile using the unique profile ID.

NOTE: The user profile feature is designed only for use by Kibana and Elastic's Observability, Enterprise Search, and Elastic Security solutions.
Individual users and external applications should not call this API directly.
Elastic reserves the right to change or remove this feature in future releases without prior notice.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-user-profile`,
  methods: ['GET'],
  patterns: ['_security/profile/{uid}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-user-profile',
  parameterTypes: {
    headerParams: [],
    pathParams: ['uid'],
    urlParams: ['data'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_get_user_profile_request, 'body'),
    ...getShapeAt(security_get_user_profile_request, 'path'),
    ...getShapeAt(security_get_user_profile_request, 'query'),
  }),
  outputSchema: security_get_user_profile_response,
};
