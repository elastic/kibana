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
 * Generated at: 2025-11-27T07:43:24.852Z
 * Source: elasticsearch-specification repository, operations: async-search-delete
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { async_search_delete_request, async_search_delete_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ASYNC_SEARCH_DELETE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.async_search.delete',
  connectorGroup: 'internal',
  summary: `Delete an async search`,
  description: `Delete an async search.

If the asynchronous search is still running, it is cancelled.
Otherwise, the saved search results are deleted.
If the Elasticsearch security features are enabled, the deletion of a specific async search is restricted to: the authenticated user that submitted the original search request; users that have the \`cancel_task\` cluster privilege.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-async-search-submit`,
  methods: ['DELETE'],
  patterns: ['_async_search/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-async-search-submit',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(async_search_delete_request, 'body'),
    ...getShapeAt(async_search_delete_request, 'path'),
    ...getShapeAt(async_search_delete_request, 'query'),
  }),
  outputSchema: async_search_delete_response,
};
