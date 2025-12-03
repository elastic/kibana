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
 * Source: elasticsearch-specification repository, operations: async-search-get
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { async_search_get_request, async_search_get_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ASYNC_SEARCH_GET_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.async_search.get',
  summary: `Get async search results`,
  description: `Get async search results.

Retrieve the results of a previously submitted asynchronous search request.
If the Elasticsearch security features are enabled, access to the results of a specific async search is restricted to the user or API key that submitted it.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-async-search-submit`,
  methods: ['GET'],
  patterns: ['_async_search/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-async-search-submit',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: ['keep_alive', 'typed_keys', 'wait_for_completion_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(async_search_get_request, 'body'),
    ...getShapeAt(async_search_get_request, 'path'),
    ...getShapeAt(async_search_get_request, 'query'),
  }),
  outputSchema: async_search_get_response,
};
