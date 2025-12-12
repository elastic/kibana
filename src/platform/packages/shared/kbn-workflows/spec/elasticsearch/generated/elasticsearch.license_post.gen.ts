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
 * Source: elasticsearch-specification repository, operations: license-post, license-post-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  license_post1_request,
  license_post1_response,
  license_post_request,
  license_post_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const LICENSE_POST_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.license.post',
  summary: `Update the license`,
  description: `Update the license.

You can update your license at runtime without shutting down your nodes.
License updates take effect immediately.
If the license you are installing does not support all of the features that were available with your previous license, however, you are notified in the response.
You must then re-submit the API request with the acknowledge parameter set to true.

NOTE: If Elasticsearch security features are enabled and you are installing a gold or higher license, you must enable TLS on the transport networking layer before you install the license.
If the operator privileges feature is enabled, only operator users can use this API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-license-post`,
  methods: ['PUT', 'POST'],
  patterns: ['_license'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-license-post',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['acknowledge', 'master_timeout', 'timeout'],
    bodyParams: ['license', 'licenses'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(license_post_request, 'body'),
      ...getShapeAt(license_post_request, 'path'),
      ...getShapeAt(license_post_request, 'query'),
    }),
    z.object({
      ...getShapeAt(license_post1_request, 'body'),
      ...getShapeAt(license_post1_request, 'path'),
      ...getShapeAt(license_post1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([license_post_response, license_post1_response]),
};
