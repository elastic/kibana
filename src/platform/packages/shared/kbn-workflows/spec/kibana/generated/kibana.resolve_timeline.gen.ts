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
 * Source: /oas_docs/output/kibana.yaml, operations: ResolveTimeline
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  resolve_timeline_request,
  resolve_timeline_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const RESOLVE_TIMELINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ResolveTimeline',
  summary: `Get an existing saved Timeline or Timeline template`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline/resolve</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['GET'],
  patterns: ['/api/timeline/resolve'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-resolvetimeline',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['template_timeline_id', 'id'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(resolve_timeline_request, 'body'),
    ...getShapeAt(resolve_timeline_request, 'path'),
    ...getShapeAt(resolve_timeline_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: resolve_timeline_response,
};
