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
 * Generated at: 2025-11-27T07:04:28.254Z
 * Source: elasticsearch-specification repository, operations: security-update-user-profile-data, security-update-user-profile-data-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_update_user_profile_data1_request,
  security_update_user_profile_data1_response,
  security_update_user_profile_data_request,
  security_update_user_profile_data_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_UPDATE_USER_PROFILE_DATA_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.update_user_profile_data',
  connectorGroup: 'internal',
  summary: `Update user profile data`,
  description: `Update user profile data.

Update specific data for the user profile that is associated with a unique ID.

NOTE: The user profile feature is designed only for use by Kibana and Elastic's Observability, Enterprise Search, and Elastic Security solutions.
Individual users and external applications should not call this API directly.
Elastic reserves the right to change or remove this feature in future releases without prior notice.

To use this API, you must have one of the following privileges:

* The \`manage_user_profile\` cluster privilege.
* The \`update_profile_data\` global privilege for the namespaces that are referenced in the request.

This API updates the \`labels\` and \`data\` fields of an existing user profile document with JSON objects.
New keys and their values are added to the profile document and conflicting keys are replaced by data that's included in the request.

For both labels and data, content is namespaced by the top-level fields.
The \`update_profile_data\` global privilege grants privileges for updating only the allowed namespaces.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-update-user-profile-data`,
  methods: ['PUT', 'POST'],
  patterns: ['_security/profile/{uid}/_data'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-update-user-profile-data',
  parameterTypes: {
    headerParams: [],
    pathParams: ['uid'],
    urlParams: ['if_seq_no', 'if_primary_term', 'refresh'],
    bodyParams: ['labels', 'data'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(security_update_user_profile_data_request, 'body'),
      ...getShapeAt(security_update_user_profile_data_request, 'path'),
      ...getShapeAt(security_update_user_profile_data_request, 'query'),
    }),
    z.object({
      ...getShapeAt(security_update_user_profile_data1_request, 'body'),
      ...getShapeAt(security_update_user_profile_data1_request, 'path'),
      ...getShapeAt(security_update_user_profile_data1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    security_update_user_profile_data_response,
    security_update_user_profile_data1_response,
  ]),
};
