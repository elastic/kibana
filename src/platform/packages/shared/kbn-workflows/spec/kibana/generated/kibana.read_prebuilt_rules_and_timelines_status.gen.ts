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
 * Source: /oas_docs/output/kibana.yaml, operations: ReadPrebuiltRulesAndTimelinesStatus
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  read_prebuilt_rules_and_timelines_status_request,
  read_prebuilt_rules_and_timelines_status_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const READ_PREBUILT_RULES_AND_TIMELINES_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'kibana.ReadPrebuiltRulesAndTimelinesStatus',
  summary: `Retrieve the status of prebuilt detection rules and Timelines`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb get">get</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules/prepackaged/_status</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Retrieve the status of all Elastic prebuilt detection rules and Timelines. 

This endpoint provides detailed information about the number of custom rules, installed prebuilt rules, available prebuilt rules that are not installed, outdated prebuilt rules, installed prebuilt timelines, available prebuilt timelines that are not installed, and outdated prebuilt timelines.
`,
  methods: ['GET'],
  patterns: ['/api/detection_engine/rules/prepackaged/_status'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-readprebuiltrulesandtimelinesstatus',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(read_prebuilt_rules_and_timelines_status_request, 'body'),
    ...getShapeAt(read_prebuilt_rules_and_timelines_status_request, 'path'),
    ...getShapeAt(read_prebuilt_rules_and_timelines_status_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: read_prebuilt_rules_and_timelines_status_response,
};
