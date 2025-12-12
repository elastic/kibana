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
 * Source: elasticsearch-specification repository, operations: async-search-status
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  async_search_status_request,
  async_search_status_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ASYNC_SEARCH_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.async_search.status',
  summary: `Get the async search status`,
  description: `Get the async search status.

Get the status of a previously submitted async search request given its identifier, without retrieving search results.
If the Elasticsearch security features are enabled, the access to the status of a specific async search is restricted to:

* The user or API key that submitted the original async search request.
* Users that have the \`monitor\` cluster privilege or greater privileges.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-async-search-submit`,
  methods: ['GET'],
  patterns: ['_async_search/status/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-async-search-submit',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: ['keep_alive'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(async_search_status_request, 'body'),
    ...getShapeAt(async_search_status_request, 'path'),
    ...getShapeAt(async_search_status_request, 'query'),
  }),
  outputSchema: async_search_status_response,
};
