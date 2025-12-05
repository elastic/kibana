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
 * Source: /oas_docs/output/kibana.yaml, operations: UpdateAttackDiscoverySchedules
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  update_attack_discovery_schedules_request,
  update_attack_discovery_schedules_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const UPDATE_ATTACK_DISCOVERY_SCHEDULES_CONTRACT: InternalConnectorContract = {
  type: 'kibana.UpdateAttackDiscoverySchedules',
  summary: `Update Attack discovery schedule`,
  description: `**Spaces method and path for this operation:**

<div><span class="operation-verb put">put</span>&nbsp;<span class="operation-path">/s/{space_id}/api/attack_discovery/schedules/{id}</span></div>

Refer to [Spaces](https://www.elastic.co/docs/deploy-manage/manage-spaces) for more information.

Updates an existing Attack discovery schedule with new configuration. All schedule properties can be modified including name, parameters, interval, and actions. The update operation replaces the entire schedule configuration with the provided values. \`Technical preview\``,
  methods: ['PUT'],
  patterns: ['/api/attack_discovery/schedules/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-updateattackdiscoveryschedules',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: ['actions', 'name', 'params', 'schedule'],
  },
  paramsSchema: z.object({
    ...getShapeAt(update_attack_discovery_schedules_request, 'body'),
    ...getShapeAt(update_attack_discovery_schedules_request, 'path'),
    ...getShapeAt(update_attack_discovery_schedules_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: update_attack_discovery_schedules_response,
};
