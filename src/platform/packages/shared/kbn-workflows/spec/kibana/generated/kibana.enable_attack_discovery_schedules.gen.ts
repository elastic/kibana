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
 * Source: /oas_docs/output/kibana.yaml, operations: EnableAttackDiscoverySchedules
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  enable_attack_discovery_schedules_request,
  enable_attack_discovery_schedules_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const ENABLE_ATTACK_DISCOVERY_SCHEDULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.EnableAttackDiscoverySchedules',
  summary: `Enable Attack discovery schedule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/schedules/{id}/_enable</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Enables a previously disabled Attack discovery schedule, allowing it to run according to its configured interval. Once enabled, the schedule will begin executing at the next scheduled time based on its interval configuration. \`Technical preview\``,
  methods: ['POST'],
  patterns: ['/api/attack_discovery/schedules/{id}/_enable'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-enableattackdiscoveryschedules',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(enable_attack_discovery_schedules_request, 'body'),
    ...getShapeAt(enable_attack_discovery_schedules_request, 'path'),
    ...getShapeAt(enable_attack_discovery_schedules_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: enable_attack_discovery_schedules_response,
};
