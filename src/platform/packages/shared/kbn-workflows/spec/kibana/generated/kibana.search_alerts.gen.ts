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
 * Source: /oas_docs/output/kibana.yaml, operations: SearchAlerts
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { search_alerts_request, search_alerts_response } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const SEARCH_ALERTS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.SearchAlerts',
  summary: `Find and/or aggregate detection alerts`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/signals/search</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Find and/or aggregate detection alerts that match the given query.`,
  methods: ['POST'],
  patterns: ['/api/detection_engine/signals/search'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-searchalerts',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [
      '_source',
      'aggs',
      'fields',
      'query',
      'runtime_mappings',
      'size',
      'sort',
      'track_total_hits',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(search_alerts_request, 'body'),
    ...getShapeAt(search_alerts_request, 'path'),
    ...getShapeAt(search_alerts_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: search_alerts_response,
};
