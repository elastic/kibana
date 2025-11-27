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
 * Generated at: 2025-11-27T07:04:28.246Z
 * Source: elasticsearch-specification repository, operations: search-application-list
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  search_application_list_request,
  search_application_list_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SEARCH_APPLICATION_LIST_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.search_application.list',
  connectorGroup: 'internal',
  summary: `Get search applications`,
  description: `Get search applications.

Get information about search applications.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-get-behavioral-analytics`,
  methods: ['GET'],
  patterns: ['_application/search_application'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-get-behavioral-analytics',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['q', 'from', 'size'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(search_application_list_request, 'body'),
    ...getShapeAt(search_application_list_request, 'path'),
    ...getShapeAt(search_application_list_request, 'query'),
  }),
  outputSchema: search_application_list_response,
};
