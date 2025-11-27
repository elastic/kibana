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
 * Generated at: 2025-11-27T07:04:28.262Z
 * Source: elasticsearch-specification repository, operations: xpack-usage
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { xpack_usage_request, xpack_usage_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const XPACK_USAGE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.xpack.usage',
  connectorGroup: 'internal',
  summary: `Get usage information`,
  description: `Get usage information.

Get information about the features that are currently enabled and available under the current license.
The API also provides some usage statistics.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-xpack`,
  methods: ['GET'],
  patterns: ['_xpack/usage'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-xpack',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(xpack_usage_request, 'body'),
    ...getShapeAt(xpack_usage_request, 'path'),
    ...getShapeAt(xpack_usage_request, 'query'),
  }),
  outputSchema: xpack_usage_response,
};
