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
 * Source: /oas_docs/output/kibana.yaml, operations: OsqueryCreateLiveQuery
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  osquery_create_live_query_request,
  osquery_create_live_query_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const OSQUERY_CREATE_LIVE_QUERY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryCreateLiveQuery',
  summary: `Create a live query`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/live_queries</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create and run a live query.`,
  methods: ['POST'],
  patterns: ['/api/osquery/live_queries'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-osquerycreatelivequery',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      'agent_all',
      'agent_ids',
      'agent_platforms',
      'agent_policy_ids',
      'alert_ids',
      'case_ids',
      'ecs_mapping',
      'event_ids',
      'metadata',
      'pack_id',
      'queries',
      'query',
      'saved_query_id',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(osquery_create_live_query_request, 'body'),
    ...getShapeAt(osquery_create_live_query_request, 'path'),
    ...getShapeAt(osquery_create_live_query_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: osquery_create_live_query_response,
};
