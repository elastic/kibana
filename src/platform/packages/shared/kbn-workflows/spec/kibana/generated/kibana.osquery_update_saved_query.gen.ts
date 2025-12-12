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
 * Source: /oas_docs/output/kibana.yaml, operations: OsqueryUpdateSavedQuery
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  osquery_update_saved_query_request,
  osquery_update_saved_query_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const OSQUERY_UPDATE_SAVED_QUERY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.OsqueryUpdateSavedQuery',
  summary: `Update a saved query`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/osquery/saved_queries/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update a saved query using the query ID.
> info
> You cannot update a prebuilt saved query.
`,
  methods: ['PUT'],
  patterns: ['/api/osquery/saved_queries/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-osqueryupdatesavedquery',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [
      'description',
      'ecs_mapping',
      'id',
      'interval',
      'platform',
      'query',
      'removed',
      'snapshot',
      'version',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(osquery_update_saved_query_request, 'body'),
    ...getShapeAt(osquery_update_saved_query_request, 'path'),
    ...getShapeAt(osquery_update_saved_query_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: osquery_update_saved_query_response,
};
