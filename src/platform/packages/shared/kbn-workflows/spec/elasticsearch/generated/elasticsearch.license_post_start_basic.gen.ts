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
 * Source: elasticsearch-specification repository, operations: license-post-start-basic
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  license_post_start_basic_request,
  license_post_start_basic_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const LICENSE_POST_START_BASIC_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.license.post_start_basic',
  summary: `Start a basic license`,
  description: `Start a basic license.

Start an indefinite basic license, which gives access to all the basic features.

NOTE: In order to start a basic license, you must not currently have a basic license.

If the basic license does not support all of the features that are available with your current license, however, you are notified in the response.
You must then re-submit the API request with the \`acknowledge\` parameter set to \`true\`.

To check the status of your basic license, use the get basic license API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-license-post-start-basic`,
  methods: ['POST'],
  patterns: ['_license/start_basic'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-license-post-start-basic',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['acknowledge', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(license_post_start_basic_request, 'body'),
    ...getShapeAt(license_post_start_basic_request, 'path'),
    ...getShapeAt(license_post_start_basic_request, 'query'),
  }),
  outputSchema: license_post_start_basic_response,
};
