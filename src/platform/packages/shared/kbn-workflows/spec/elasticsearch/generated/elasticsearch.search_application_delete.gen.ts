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
 * Source: elasticsearch-specification repository, operations: search-application-delete
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  search_application_delete_request,
  search_application_delete_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SEARCH_APPLICATION_DELETE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.search_application.delete',
  summary: `Delete a search application`,
  description: `Delete a search application.

Remove a search application and its associated alias. Indices attached to the search application are not removed.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-delete`,
  methods: ['DELETE'],
  patterns: ['_application/search_application/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-application-delete',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(search_application_delete_request, 'body'),
    ...getShapeAt(search_application_delete_request, 'path'),
    ...getShapeAt(search_application_delete_request, 'query'),
  }),
  outputSchema: search_application_delete_response,
};
