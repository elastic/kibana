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
 * Source: /oas_docs/output/kibana.yaml, operations: OsqueryGetLiveQueryResults
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  osquery_get_live_query_results_request,
  osquery_get_live_query_results_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const OSQUERY_GET_LIVE_QUERY_RESULTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryGetLiveQueryResults',
  summary: `Get live query results`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/live_queries/{id}/results/{actionId}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the results of a live query using the query action ID.`,
  methods: ['GET'],
  patterns: ['/api/osquery/live_queries/{id}/results/{actionId}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-osquerygetlivequeryresults',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id', 'actionId'],
    urlParams: ['kuery', 'page', 'pageSize', 'sort', 'sortOrder'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(osquery_get_live_query_results_request, 'body'),
    ...getShapeAt(osquery_get_live_query_results_request, 'path'),
    ...getShapeAt(osquery_get_live_query_results_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: osquery_get_live_query_results_response,
};
