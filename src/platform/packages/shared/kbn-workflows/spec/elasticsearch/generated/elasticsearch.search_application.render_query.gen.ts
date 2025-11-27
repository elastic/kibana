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
 * Source: elasticsearch-specification repository, operations: search-application-render-query
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  search_application_render_query_request,
  search_application_render_query_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SEARCH_APPLICATION_RENDER_QUERY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.search_application.render_query',
  connectorGroup: 'internal',
  summary: `Render a search application query`,
  description: `Render a search application query.

Generate an Elasticsearch query using the specified query parameters and the search template associated with the search application or a default template if none is specified.
If a parameter used in the search template is not specified in \`params\`, the parameter's default value will be used.
The API returns the specific Elasticsearch query that would be generated and run by calling the search application search API.

You must have \`read\` privileges on the backing alias of the search application.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-render-query`,
  methods: ['POST'],
  patterns: ['_application/search_application/{name}/_render_query'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-render-query',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: [],
    bodyParams: ['params'],
  },
  paramsSchema: z.object({
    ...getShapeAt(search_application_render_query_request, 'body'),
    ...getShapeAt(search_application_render_query_request, 'path'),
    ...getShapeAt(search_application_render_query_request, 'query'),
  }),
  outputSchema: search_application_render_query_response,
};
