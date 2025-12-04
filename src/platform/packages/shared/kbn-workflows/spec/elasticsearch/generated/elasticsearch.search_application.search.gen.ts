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
 * Source: elasticsearch-specification repository, operations: search-application-search, search-application-search-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  search_application_search1_request,
  search_application_search1_response,
  search_application_search_request,
  search_application_search_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SEARCH_APPLICATION_SEARCH_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.search_application.search',
  summary: `Run a search application search`,
  description: `Run a search application search.

Generate and run an Elasticsearch query that uses the specified query parameteter and the search template associated with the search application or default template.
Unspecified template parameters are assigned their default values if applicable.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-search`,
  methods: ['GET', 'POST'],
  patterns: ['_application/search_application/{name}/_search'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-search',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['typed_keys'],
    bodyParams: ['params'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(search_application_search_request, 'body'),
      ...getShapeAt(search_application_search_request, 'path'),
      ...getShapeAt(search_application_search_request, 'query'),
    }),
    z.object({
      ...getShapeAt(search_application_search1_request, 'body'),
      ...getShapeAt(search_application_search1_request, 'path'),
      ...getShapeAt(search_application_search1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([search_application_search_response, search_application_search1_response]),
};
