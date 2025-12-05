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
 * Source: elasticsearch-specification repository, operations: security-delete-role-mapping
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_delete_role_mapping_request,
  security_delete_role_mapping_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_DELETE_ROLE_MAPPING_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.delete_role_mapping',
  summary: `Delete role mappings`,
  description: `Delete role mappings.

Role mappings define which roles are assigned to each user.
The role mapping APIs are generally the preferred way to manage role mappings rather than using role mapping files.
The delete role mappings API cannot remove role mappings that are defined in role mapping files.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-delete-role-mapping`,
  methods: ['DELETE'],
  patterns: ['_security/role_mapping/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-delete-role-mapping',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['refresh'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_delete_role_mapping_request, 'body'),
    ...getShapeAt(security_delete_role_mapping_request, 'path'),
    ...getShapeAt(security_delete_role_mapping_request, 'query'),
  }),
  outputSchema: security_delete_role_mapping_response,
};
