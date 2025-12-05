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
 * Source: elasticsearch-specification repository, operations: license-delete
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { license_delete_request, license_delete_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const LICENSE_DELETE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.license.delete',
  summary: `Delete the license`,
  description: `Delete the license.

When the license expires, your subscription level reverts to Basic.

If the operator privileges feature is enabled, only operator users can use this API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-license-delete`,
  methods: ['DELETE'],
  patterns: ['_license'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-license-delete',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(license_delete_request, 'body'),
    ...getShapeAt(license_delete_request, 'path'),
    ...getShapeAt(license_delete_request, 'query'),
  }),
  outputSchema: license_delete_response,
};
