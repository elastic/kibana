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
 * Generated at: 2025-11-27T07:43:24.913Z
 * Source: elasticsearch-specification repository, operations: security-get-role-mapping, security-get-role-mapping-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_get_role_mapping1_request,
  security_get_role_mapping1_response,
  security_get_role_mapping_request,
  security_get_role_mapping_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_GET_ROLE_MAPPING_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.get_role_mapping',
  connectorGroup: 'internal',
  summary: `Get role mappings`,
  description: `Get role mappings.

Role mappings define which roles are assigned to each user.
The role mapping APIs are generally the preferred way to manage role mappings rather than using role mapping files.
The get role mappings API cannot retrieve role mappings that are defined in role mapping files.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-role-mapping`,
  methods: ['GET'],
  patterns: ['_security/role_mapping/{name}', '_security/role_mapping'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-get-role-mapping',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(security_get_role_mapping_request, 'body'),
      ...getShapeAt(security_get_role_mapping_request, 'path'),
      ...getShapeAt(security_get_role_mapping_request, 'query'),
    }),
    z.object({
      ...getShapeAt(security_get_role_mapping1_request, 'body'),
      ...getShapeAt(security_get_role_mapping1_request, 'path'),
      ...getShapeAt(security_get_role_mapping1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([security_get_role_mapping_response, security_get_role_mapping1_response]),
};
