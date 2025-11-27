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
 * Generated at: 2025-11-27T07:43:24.908Z
 * Source: elasticsearch-specification repository, operations: search-application-get
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  search_application_get_request,
  search_application_get_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SEARCH_APPLICATION_GET_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.search_application.get',
  connectorGroup: 'internal',
  summary: `Get search application details`,
  description: `Get search application details.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-get`,
  methods: ['GET'],
  patterns: ['_application/search_application/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-get',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(search_application_get_request, 'body'),
    ...getShapeAt(search_application_get_request, 'path'),
    ...getShapeAt(search_application_get_request, 'query'),
  }),
  outputSchema: search_application_get_response,
};
