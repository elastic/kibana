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
 * Source: /oas_docs/output/kibana.yaml, operations: CleanDraftTimelines
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  clean_draft_timelines_request,
  clean_draft_timelines_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const CLEAN_DRAFT_TIMELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CleanDraftTimelines',
  summary: `Create a clean draft Timeline or Timeline template`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline/_draft</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Create a clean draft Timeline or Timeline template for the current user.
> info
> If the user already has a draft Timeline, the existing draft Timeline is cleared and returned.
`,
  methods: ['POST'],
  patterns: ['/api/timeline/_draft'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-cleandrafttimelines',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['timelineType'],
  },
  paramsSchema: z.object({
    ...getShapeAt(clean_draft_timelines_request, 'body'),
    ...getShapeAt(clean_draft_timelines_request, 'path'),
    ...getShapeAt(clean_draft_timelines_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: clean_draft_timelines_response,
};
