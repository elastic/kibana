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
 * Source: /oas_docs/output/kibana.yaml, operations: PatchTimeline
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { patch_timeline_request, patch_timeline_response } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const PATCH_TIMELINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.PatchTimeline',
  summary: `Update a Timeline`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb patch">patch</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Update an existing Timeline. You can update the title, description, date range, pinned events, pinned queries, and/or pinned saved queries of an existing Timeline.`,
  methods: ['PATCH'],
  patterns: ['/api/timeline'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-patchtimeline',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['timeline', 'timelineId', 'version'],
  },
  paramsSchema: z.object({
    ...getShapeAt(patch_timeline_request, 'body'),
    ...getShapeAt(patch_timeline_request, 'path'),
    ...getShapeAt(patch_timeline_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: patch_timeline_response,
};
