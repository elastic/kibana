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
 * Source: /oas_docs/output/kibana.yaml, operations: RulePreview
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { rule_preview_request, rule_preview_response } from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const RULE_PREVIEW_CONTRACT: InternalConnectorContract = {
  type: 'kibana.RulePreview',
  summary: `Preview rule alerts generated on specified time range`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules/preview</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.`,
  methods: ['POST'],
  patterns: ['/api/detection_engine/rules/preview'],
  documentation: 'https://www.elastic.co/docs/api/doc/kibana/operation/operation-rulepreview',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['enable_logged_requests'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(rule_preview_request, 'body'),
    ...getShapeAt(rule_preview_request, 'path'),
    ...getShapeAt(rule_preview_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: rule_preview_response,
};
