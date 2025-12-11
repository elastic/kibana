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
 * Source: elasticsearch-specification repository, operations: search-application-put
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  search_application_put_request,
  search_application_put_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SEARCH_APPLICATION_PUT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.search_application.put',
  summary: `Create or update a search application`,
  description: `Create or update a search application.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-put`,
  methods: ['PUT'],
  patterns: ['_application/search_application/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-put',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['create'],
    bodyParams: ['indices', 'analytics_collection_name', 'template'],
  },
  paramsSchema: z.object({
    ...getShapeAt(search_application_put_request, 'body'),
    ...getShapeAt(search_application_put_request, 'path'),
    ...getShapeAt(search_application_put_request, 'query'),
  }),
  outputSchema: search_application_put_response,
};
