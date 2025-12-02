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
 * Source: /oas_docs/output/kibana.yaml, operations: DisableAttackDiscoverySchedules
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  disable_attack_discovery_schedules_request,
  disable_attack_discovery_schedules_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const DISABLE_ATTACK_DISCOVERY_SCHEDULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.DisableAttackDiscoverySchedules',
  summary: `Disable Attack discovery schedule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb post">post</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/schedules/{id}/_disable</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Disables an Attack discovery schedule, preventing it from running according to its configured interval. The schedule configuration is preserved and can be re-enabled later. Any currently running executions will complete, but no new executions will be started. \`Technical preview\``,
  methods: ['POST'],
  patterns: ['/api/attack_discovery/schedules/{id}/_disable'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-disableattackdiscoveryschedules',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(disable_attack_discovery_schedules_request, 'body'),
    ...getShapeAt(disable_attack_discovery_schedules_request, 'path'),
    ...getShapeAt(disable_attack_discovery_schedules_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: disable_attack_discovery_schedules_response,
};
