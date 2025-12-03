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
 * Source: /oas_docs/output/kibana.yaml, operations: DeleteTimelines
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { delete_timelines_request } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const DELETE_TIMELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DeleteTimelines',
  summary: `Delete Timelines or Timeline templates`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb delete">delete</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Delete one or more Timelines or Timeline templates.`,
  methods: ['DELETE'],
  patterns: ['/api/timeline'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-deletetimelines',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['savedObjectIds', 'searchIds'],
  },
  paramsSchema: z.object({
    ...getShapeAt(delete_timelines_request, 'body'),
    ...getShapeAt(delete_timelines_request, 'path'),
    ...getShapeAt(delete_timelines_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: z.optional(z.looseObject({})),
};
