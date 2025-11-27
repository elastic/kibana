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
 * Source: elasticsearch-specification repository, operations: xpack-info
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { xpack_info_request, xpack_info_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const XPACK_INFO_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.xpack.info',
  connectorGroup: 'internal',
  summary: `Get information`,
  description: `Get information.

The information provided by the API includes:

* Build information including the build number and timestamp.
* License information about the currently installed license.
* Feature information for the features that are currently enabled and available under the current license.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-info`,
  methods: ['GET'],
  patterns: ['_xpack'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-info',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['categories', 'accept_enterprise', 'human'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(xpack_info_request, 'body'),
    ...getShapeAt(xpack_info_request, 'path'),
    ...getShapeAt(xpack_info_request, 'query'),
  }),
  outputSchema: xpack_info_response,
};
