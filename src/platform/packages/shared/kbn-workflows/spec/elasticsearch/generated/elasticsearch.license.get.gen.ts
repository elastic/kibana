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
 * Generated at: 2025-11-27T07:43:24.893Z
 * Source: elasticsearch-specification repository, operations: license-get
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { license_get_request, license_get_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const LICENSE_GET_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.license.get',
  connectorGroup: 'internal',
  summary: `Get license information`,
  description: `Get license information.

Get information about your Elastic license including its type, its status, when it was issued, and when it expires.

>info
> If the master node is generating a new cluster state, the get license API may return a \`404 Not Found\` response.
> If you receive an unexpected 404 response after cluster startup, wait a short period and retry the request.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-license-get`,
  methods: ['GET'],
  patterns: ['_license'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-license-get',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['accept_enterprise', 'local'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(license_get_request, 'body'),
    ...getShapeAt(license_get_request, 'path'),
    ...getShapeAt(license_get_request, 'query'),
  }),
  outputSchema: license_get_response,
};
