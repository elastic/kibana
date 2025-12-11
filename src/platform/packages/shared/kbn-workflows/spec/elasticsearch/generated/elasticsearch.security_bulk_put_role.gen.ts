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
 * Source: elasticsearch-specification repository, operations: security-bulk-put-role
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  security_bulk_put_role_request,
  security_bulk_put_role_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SECURITY_BULK_PUT_ROLE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.security.bulk_put_role',
  summary: `Bulk create or update roles`,
  description: `Bulk create or update roles.

The role management APIs are generally the preferred way to manage roles, rather than using file-based role management.
The bulk create or update roles API cannot update roles that are defined in roles files.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-bulk-put-role`,
  methods: ['POST'],
  patterns: ['_security/role'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-bulk-put-role',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['refresh'],
    bodyParams: ['roles'],
  },
  paramsSchema: z.object({
    ...getShapeAt(security_bulk_put_role_request, 'body'),
    ...getShapeAt(security_bulk_put_role_request, 'path'),
    ...getShapeAt(security_bulk_put_role_request, 'query'),
  }),
  outputSchema: security_bulk_put_role_response,
};
