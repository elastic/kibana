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
 * Source: /oas_docs/output/kibana.yaml, operations: CopyTimeline
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { copy_timeline_request, copy_timeline_response } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const COPY_TIMELINE_CONTRACT: InternalConnectorContract = {
  type: 'kibana.CopyTimeline',
  summary: `Copies timeline or timeline template`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/timeline/_copy</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Copies and returns a timeline or timeline template.
`,
  methods: ['GET'],
  patterns: ['/api/timeline/_copy'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-copytimeline',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: ['timeline', 'timelineIdToCopy'],
  },
  paramsSchema: z.object({
    ...getShapeAt(copy_timeline_request, 'body'),
    ...getShapeAt(copy_timeline_request, 'path'),
    ...getShapeAt(copy_timeline_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: copy_timeline_response,
};
