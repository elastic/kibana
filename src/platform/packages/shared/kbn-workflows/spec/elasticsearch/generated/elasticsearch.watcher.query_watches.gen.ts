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
 * Generated at: 2025-11-27T07:04:28.262Z
 * Source: elasticsearch-specification repository, operations: watcher-query-watches, watcher-query-watches-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  watcher_query_watches1_request,
  watcher_query_watches1_response,
  watcher_query_watches_request,
  watcher_query_watches_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const WATCHER_QUERY_WATCHES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.watcher.query_watches',
  connectorGroup: 'internal',
  summary: `Query watches`,
  description: `Query watches.

Get all registered watches in a paginated manner and optionally filter watches by a query.

Note that only the \`_id\` and \`metadata.*\` fields are queryable or sortable.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-query-watches`,
  methods: ['GET', 'POST'],
  patterns: ['_watcher/_query/watches'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-query-watches',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['from', 'size', 'query', 'sort', 'search_after'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(watcher_query_watches_request, 'body'),
      ...getShapeAt(watcher_query_watches_request, 'path'),
      ...getShapeAt(watcher_query_watches_request, 'query'),
    }),
    z.object({
      ...getShapeAt(watcher_query_watches1_request, 'body'),
      ...getShapeAt(watcher_query_watches1_request, 'path'),
      ...getShapeAt(watcher_query_watches1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([watcher_query_watches_response, watcher_query_watches1_response]),
};
