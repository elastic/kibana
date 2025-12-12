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
 * Source: /oas_docs/output/kibana.yaml, operations: InstallPrebuiltRulesAndTimelines
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  install_prebuilt_rules_and_timelines_request,
  install_prebuilt_rules_and_timelines_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const INSTALL_PREBUILT_RULES_AND_TIMELINES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.InstallPrebuiltRulesAndTimelines',
  summary: `Install prebuilt detection rules and Timelines`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/detection_engine/rules/prepackaged</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Install and update all Elastic prebuilt detection rules and Timelines.

This endpoint allows you to install and update prebuilt detection rules and Timelines provided by Elastic. 
When you call this endpoint, it will:
- Install any new prebuilt detection rules that are not currently installed in your system.
- Update any existing prebuilt detection rules that have been modified or improved by Elastic.
- Install any new prebuilt Timelines that are not currently installed in your system.
- Update any existing prebuilt Timelines that have been modified or improved by Elastic.

This ensures that your detection engine is always up-to-date with the latest rules and Timelines, 
providing you with the most current and effective threat detection capabilities.
`,
  methods: ['PUT'],
  patterns: ['/api/detection_engine/rules/prepackaged'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-installprebuiltrulesandtimelines',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(install_prebuilt_rules_and_timelines_request, 'body'),
    ...getShapeAt(install_prebuilt_rules_and_timelines_request, 'path'),
    ...getShapeAt(install_prebuilt_rules_and_timelines_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: install_prebuilt_rules_and_timelines_response,
};
