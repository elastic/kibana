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
 * Generated at: 2025-11-27T07:43:24.891Z
 * Source: elasticsearch-specification repository, operations: info
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { info_request, info_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INFO_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.info',
  connectorGroup: 'internal',
  summary: `Get cluster info`,
  description: `Get cluster info.

Get basic build, version, and cluster information.
::: In Serverless, this API is retained for backward compatibility only. Some response fields, such as the version number, should be ignored.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-info`,
  methods: ['GET'],
  patterns: [''],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-info',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(info_request, 'body'),
    ...getShapeAt(info_request, 'path'),
    ...getShapeAt(info_request, 'query'),
  }),
  outputSchema: info_response,
};
