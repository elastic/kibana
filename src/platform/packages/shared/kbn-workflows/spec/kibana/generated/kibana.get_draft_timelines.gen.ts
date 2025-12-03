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
 * Source: /oas_docs/output/kibana.yaml, operations: GetDraftTimelines
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  get_draft_timelines_request,
  get_draft_timelines_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const GET_DRAFT_TIMELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.GetDraftTimelines',
  summary: `Get draft Timeline or Timeline template details`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline/_draft</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Get the details of the draft Timeline  or Timeline template for the current user. If the user doesn't have a draft Timeline, an empty Timeline is returned.`,
  methods: ['GET'],
  patterns: ['/api/timeline/_draft'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-getdrafttimelines',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['timelineType'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(get_draft_timelines_request, 'body'),
    ...getShapeAt(get_draft_timelines_request, 'path'),
    ...getShapeAt(get_draft_timelines_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: get_draft_timelines_response,
};
