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
 * Source: /oas_docs/output/kibana.yaml, operations: OsqueryFindLiveQueries
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  osquery_find_live_queries_request,
  osquery_find_live_queries_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const OSQUERY_FIND_LIVE_QUERIES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryFindLiveQueries',
  summary: `Get live queries`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/live_queries</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get a list of all live queries.`,
  methods: ['GET'],
  patterns: ['/api/osquery/live_queries'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-osqueryfindlivequeries',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['kuery', 'page', 'pageSize', 'sort', 'sortOrder'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(osquery_find_live_queries_request, 'body'),
    ...getShapeAt(osquery_find_live_queries_request, 'path'),
    ...getShapeAt(osquery_find_live_queries_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: osquery_find_live_queries_response,
};
